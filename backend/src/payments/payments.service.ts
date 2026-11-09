import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { DataSource, LessThan, Repository } from 'typeorm';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { BookingNotificationsService } from '../notifications/booking-notifications.service';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { activeReservation, PAYMENT_HOLD_MS } from '../reservations/reservation-hold';
import { ReservationsService } from '../reservations/reservations.service';
import { Seat } from '../seats/entities/seat.entity';
import { Role } from '../users/entities/user.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { InvoiceService } from './invoice.service';
import { toMinorUnits } from './pricing';
import { StripeService } from './stripe.service';

const SWEEP_INTERVAL_MS = 60 * 1000;

export type PaymentOutcome = 'PAID' | 'REFUNDED' | 'PENDING';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Reservation) private readonly reservationsRepo: Repository<Reservation>,
    private readonly reservations: ReservationsService,
    private readonly stripe: StripeService,
    private readonly invoices: InvoiceService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly notifier: BookingNotificationsService,
  ) {}

  // Libère régulièrement les places dont le délai de paiement est dépassé.
  onModuleInit() {
    this.sweepTimer = setInterval(() => {
      this.expireStale().catch((e) => this.logger.error(`Expiration des paiements : ${e.message}`));
    }, SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }

  /** Crée (ou réutilise) la page de paiement Stripe Checkout d'une réservation en attente. */
  async createCheckout(user: AuthUser, reservationId: number): Promise<{ url: string }> {
    const resa = await this.reservations.findOneFull(reservationId);
    if (resa.userId !== user.id) throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    const payment = resa.payment;
    if (resa.status !== ReservationStatus.PENDING_PAYMENT || !payment) {
      throw new BadRequestException("Cette réservation n'attend pas de paiement.");
    }
    if (new Date(resa.createdAt).getTime() + PAYMENT_HOLD_MS < Date.now()) {
      throw new BadRequestException(
        'Le délai de paiement est dépassé : la place a été libérée. Merci de refaire une réservation.',
      );
    }

    const frontend = this.config.get<string>('frontendUrl');
    if (payment.stripeSessionId) {
      const existing = await this.stripe.retrieveSession(payment.stripeSessionId);
      if (existing.status === 'open' && existing.url) return { url: existing.url };
      if (existing.status === 'complete') {
        await this.finalize(existing.id);
        return { url: `${frontend}/payment/success?session_id=${existing.id}` };
      }
    }

    const tz = this.config.get<string>('billing.timezone');
    const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('fr-FR', { timeZone: tz, ...opts }).format(new Date(d));

    const session = await this.stripe.createCheckoutSession({
      mode: 'payment',
      locale: 'fr',
      customer_email: resa.user?.email,
      client_reference_id: String(resa.id),
      metadata: { reservationId: String(resa.id), paymentId: String(payment.id) },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: payment.currency,
            unit_amount: toMinorUnits(payment.amountTTC, payment.currency),
            product_data: {
              name: `Place ${resa.seat?.label} — ${resa.seat?.space?.name}`,
              description:
                `${fmt(resa.startTime, { dateStyle: 'full' })}, ` +
                `${fmt(resa.startTime, { timeStyle: 'short' })} – ${fmt(resa.endTime, { timeStyle: 'short' })} ` +
                `(${payment.hours} h) · TVA ${Math.round(payment.vatRate * 100)} % incluse`,
            },
          },
        },
      ],
      success_url: `${frontend}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/payment/cancel?reservation=${resa.id}`,
      // Minimum imposé par Stripe : 30 min.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });

    payment.stripeSessionId = session.id;
    await this.payments.save(payment);
    return { url: session.url! };
  }

  /** Appelé par le frontend au retour de Stripe : vérifie la session côté serveur (on ne croit pas l'URL). */
  async confirm(user: AuthUser, sessionId: string) {
    const payment = await this.payments.findOne({
      where: { stripeSessionId: sessionId },
      relations: { reservation: true },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable.');
    if (payment.reservation.userId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Ce paiement ne vous appartient pas.');
    }
    const outcome = await this.finalize(sessionId);
    return { outcome, reservation: await this.reservations.findOneDto(payment.reservationId) };
  }

  /** Webhook Stripe : même finalisation que confirm(), pour le cas où l'utilisateur ferme l'onglet. */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = this.config.get<string>('stripe.webhookSecret');
    if (!secret) throw new BadRequestException('Webhook Stripe non configuré (STRIPE_WEBHOOK_SECRET).');
    if (!rawBody || !signature) throw new BadRequestException('Signature Stripe manquante.');

    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(rawBody, signature, secret);
    } catch (e) {
      throw new BadRequestException(`Signature Stripe invalide : ${(e as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.finalize(event.data.object.id);
        break;
      case 'checkout.session.expired':
        await this.expireBySession(event.data.object.id);
        break;
    }
    return { received: true };
  }

  /**
   * Idempotent (confirm et webhook peuvent arriver tous les deux, dans n'importe quel ordre).
   * Si la place n'est plus libre (délai dépassé puis repris par quelqu'un) ou si la réservation
   * a été annulée entre-temps, le paiement est remboursé automatiquement.
   */
  async finalize(sessionId: string): Promise<PaymentOutcome> {
    const session = await this.stripe.retrieveSessionWithCharge(sessionId);
    if (session.payment_status !== 'paid') return 'PENDING';

    const intent = session.payment_intent;
    const intentId = typeof intent === 'string' ? intent : (intent?.id ?? null);
    const charge = intent && typeof intent !== 'string' && typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    const card = charge?.payment_method_details?.card;

    const existing = await this.payments.findOne({
      where: { stripeSessionId: sessionId },
      relations: { reservation: true },
    });
    if (!existing) return 'PENDING';

    // Rempli uniquement par l'appel qui fait changer le statut : confirm et webhook ne notifient pas deux fois.
    let transition = null as 'PAID' | 'REFUNDED' | null;
    const outcome = await this.dataSource.transaction(async (m): Promise<PaymentOutcome> => {
      // Même ordre de verrouillage que la création de réservation : la place d'abord.
      await m.findOne(Seat, { where: { id: existing.reservation.seatId }, lock: { mode: 'pessimistic_write' } });
      const payment = await m.findOne(Payment, { where: { id: existing.id }, lock: { mode: 'pessimistic_write' } });
      const resa = await m.findOne(Reservation, { where: { id: existing.reservationId } });
      if (!payment || !resa) return 'PENDING';
      if (payment.status === PaymentStatus.PAID) return 'PAID';
      if (payment.status === PaymentStatus.REFUNDED) return 'REFUNDED';

      payment.stripePaymentIntentId = intentId;
      payment.cardBrand = card?.brand ?? null;
      payment.cardLast4 = card?.last4 ?? null;
      payment.paidAt = new Date();

      const mustRefund = payment.status === PaymentStatus.CANCELLED || (await this.hasConflict(m, resa));
      if (mustRefund) {
        if (intentId) await this.stripe.refund(intentId);
        payment.status = PaymentStatus.REFUNDED;
        payment.refundedAt = new Date();
        resa.status = ReservationStatus.CANCELLED;
        this.logger.warn(`Paiement ${payment.id} remboursé : réservation ${resa.id} annulée ou place reprise.`);
      } else {
        payment.status = PaymentStatus.PAID;
        payment.invoiceNumber = `FAC-${payment.paidAt.getFullYear()}-${String(payment.id).padStart(6, '0')}`;
        resa.status = ReservationStatus.CONFIRMED;
      }
      await m.save(Payment, payment);
      await m.save(Reservation, resa);
      transition = payment.status === PaymentStatus.PAID ? 'PAID' : 'REFUNDED';
      return transition;
    });

    if (transition === 'PAID') await this.notifier.confirmed(existing.reservationId);
    if (transition === 'REFUNDED') await this.notifier.refunded(existing.reservationId);
    return outcome;
  }

  /** Facture PDF : propriétaire de la réservation ou admin. */
  async invoice(user: AuthUser, reservationId: number) {
    const resa = await this.reservations.findOneFull(reservationId);
    if (resa.userId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Cette facture ne vous appartient pas.');
    }
    const payment = resa.payment;
    if (!payment?.invoiceNumber) throw new NotFoundException('Aucune facture pour cette réservation.');
    const pdf = await this.invoices.generate(resa, payment);
    return { pdf, filename: `facture-${payment.invoiceNumber}.pdf` };
  }

  // ---------- helpers ----------

  /** Une autre réservation active chevauche-t-elle la place ou l'utilisateur sur ce créneau ? */
  private async hasConflict(m: DataSource['manager'], resa: Reservation) {
    const active = activeReservation('o');
    const qb = () =>
      m
        .createQueryBuilder(Reservation, 'o')
        .where('o.id <> :id', { id: resa.id })
        .andWhere(`${active.sql} AND o.startTime < :end AND o.endTime > :start`, {
          ...active.params,
          start: resa.startTime,
          end: resa.endTime,
        });
    return (
      (await qb().andWhere('o.seatId = :seatId', { seatId: resa.seatId }).getExists()) ||
      (await qb().andWhere('o.userId = :userId', { userId: resa.userId }).getExists())
    );
  }

  private async expireBySession(sessionId: string) {
    const payment = await this.payments.findOne({ where: { stripeSessionId: sessionId } });
    if (payment?.status === PaymentStatus.PENDING) await this.markExpired(payment.reservationId);
  }

  private async expireStale() {
    const stale = await this.reservationsRepo.find({
      where: {
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: LessThan(new Date(Date.now() - PAYMENT_HOLD_MS)),
      },
      relations: { payment: true },
    });
    for (const resa of stale) {
      if (resa.payment?.stripeSessionId) await this.stripe.expireSession(resa.payment.stripeSessionId);
      await this.markExpired(resa.id);
    }
  }

  private async markExpired(reservationId: number) {
    const expired = await this.dataSource.transaction(async (m) => {
      const updated = await m.update(
        Reservation,
        { id: reservationId, status: ReservationStatus.PENDING_PAYMENT },
        { status: ReservationStatus.CANCELLED },
      );
      await m.update(
        Payment,
        { reservationId, status: PaymentStatus.PENDING },
        { status: PaymentStatus.EXPIRED },
      );
      return updated.affected === 1;
    });
    // Le minuteur et le webhook Stripe peuvent traiter la même réservation : un seul message.
    if (expired) await this.notifier.expired(reservationId);
  }
}
