import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Role, User } from '../users/entities/user.entity';
import { NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

const REMINDER_LEAD_MS = 60 * 60 * 1000; // rappel 1 h avant le début
const SWEEP_INTERVAL_MS = 60 * 1000;

interface UserNotice {
  type: NotificationType;
  title: string;
  message: string;
  subject: string;
}

/**
 * Prévient l'utilisateur (dans l'application et par email) et les admins (dans l'application)
 * de la vie d'une réservation. À appeler après la validation de la transaction.
 * Aucune méthode ne lève d'erreur : une notification ratée ne doit jamais annuler une réservation.
 */
@Injectable()
export class BookingNotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingNotificationsService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.sweepTimer = setInterval(() => void this.sendReminders(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }

  confirmed(reservationId: number) {
    return this.safely(reservationId, async (r) => {
      const slot = this.describe(r);
      const p = r.payment;
      const paid = p ? ` Montant payé : ${this.money(p.amountTTC, p.currency)}.` : '';
      await this.notifyUser(r, {
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Réservation confirmée',
        message: `${slot}.${paid}`,
        subject: 'Votre réservation est confirmée',
      });
      await this.notifyAdmins(r, NotificationType.ADMIN_BOOKING_CREATED, 'Nouvelle réservation', `${r.user.fullName} : ${slot}.`);
    });
  }

  cancelled(reservationId: number, opts: { byAdmin: boolean; refunded: boolean }) {
    return this.safely(reservationId, async (r) => {
      const slot = this.describe(r);
      const who = opts.byAdmin ? ' par un administrateur' : '';
      const refund = opts.refunded ? ' Le paiement a été intégralement remboursé.' : '';
      await this.notifyUser(r, {
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Réservation annulée',
        message: `${slot} a été annulée${who}.${refund}`,
        subject: 'Votre réservation est annulée',
      });
      if (!opts.byAdmin) {
        await this.notifyAdmins(r, NotificationType.ADMIN_BOOKING_CANCELLED, 'Réservation annulée', `${r.user.fullName} : ${slot}.${refund}`);
      }
    });
  }

  /** Paiement arrivé après annulation, ou place reprise entre-temps : l'utilisateur a été remboursé. */
  refunded(reservationId: number) {
    return this.safely(reservationId, (r) =>
      this.notifyUser(r, {
        type: NotificationType.BOOKING_REFUNDED,
        title: 'Paiement remboursé',
        message: `${this.describe(r)} n'a pas pu être confirmée car la réservation n'était plus active. Votre paiement a été intégralement remboursé.`,
        subject: 'Votre paiement a été remboursé',
      }),
    );
  }

  expired(reservationId: number) {
    return this.safely(reservationId, (r) =>
      this.notifyUser(r, {
        type: NotificationType.BOOKING_EXPIRED,
        title: 'Délai de paiement dépassé',
        message: `${this.describe(r)} : le paiement n'a pas été effectué à temps et la place a été libérée.`,
        subject: 'Votre réservation a expiré',
      }),
    );
  }

  /** Public pour les tests ; appelé chaque minute par le minuteur. */
  async sendReminders() {
    try {
      const now = new Date();
      const due = await this.reservations.find({
        where: {
          status: ReservationStatus.CONFIRMED,
          reminderSentAt: IsNull(),
          startTime: Between(now, new Date(now.getTime() + REMINDER_LEAD_MS)),
        },
        relations: { seat: { space: true }, user: true },
      });
      for (const r of due) {
        // Réservée moins d'une heure avant le début : la confirmation vient d'être envoyée, un rappel serait redondant.
        if (new Date(r.startTime).getTime() - new Date(r.createdAt).getTime() < REMINDER_LEAD_MS) continue;
        // Le « reminderSentAt IS NULL » garantit un seul rappel, même avec plusieurs instances du backend.
        const claim = await this.reservations.update({ id: r.id, reminderSentAt: IsNull() }, { reminderSentAt: now });
        if (claim.affected !== 1) continue;
        await this.notifyUser(r, {
          type: NotificationType.BOOKING_REMINDER,
          title: 'Votre réservation approche',
          message: `${this.describe(r)} commence bientôt.`,
          subject: 'Rappel : votre réservation commence bientôt',
        });
      }
    } catch (e) {
      this.logger.error(`Rappels de réservation : ${(e as Error).message}`);
    }
  }

  // ---------- helpers ----------

  private async safely(reservationId: number, send: (r: Reservation) => Promise<void>) {
    try {
      const r = await this.reservations.findOne({
        where: { id: reservationId },
        relations: { seat: { space: true }, user: true, payment: true },
      });
      if (r) await send(r);
    } catch (e) {
      this.logger.error(`Notification de la réservation ${reservationId} : ${(e as Error).message}`);
    }
  }

  private async notifyUser(r: Reservation, notice: UserNotice) {
    await this.notifications.create([
      { userId: r.userId, type: notice.type, title: notice.title, message: notice.message, reservationId: r.id },
    ]);
    // Non attendu : la réponse à l'utilisateur ne dépend pas de la vitesse du serveur SMTP.
    void this.mail.send({
      to: r.user.email,
      subject: notice.subject,
      title: notice.title,
      lines: [`Bonjour ${r.user.fullName},`, notice.message],
      action: { label: 'Voir mes réservations', url: `${this.config.get<string>('frontendUrl')}/my-reservations` },
    });
  }

  private async notifyAdmins(r: Reservation, type: NotificationType, title: string, message: string) {
    const admins = await this.users.find({ where: { role: Role.ADMIN, isActive: true }, select: { id: true } });
    await this.notifications.create(
      admins
        .filter((a) => a.id !== r.userId)
        .map((a) => ({ userId: a.id, type, title, message, reservationId: r.id })),
    );
  }

  /** « Place A1 — Salle Atlas, vendredi 6 novembre 2026, 14:00 – 16:00 » */
  private describe(r: Reservation) {
    const timeZone = this.config.get<string>('billing.timezone');
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('fr-FR', { timeZone, ...o }).format(new Date(d));
    return (
      `Place ${r.seat.label} — ${r.seat.space.name}, ${fmt(r.startTime, { dateStyle: 'full' })}, ` +
      `${fmt(r.startTime, { timeStyle: 'short' })} – ${fmt(r.endTime, { timeStyle: 'short' })}`
    );
  }

  private money(amount: number, currency: string) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  }
}
