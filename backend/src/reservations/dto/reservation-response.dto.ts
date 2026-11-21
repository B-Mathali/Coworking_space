import { PaymentStatus } from '../../payments/entities/payment.entity';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { PAYMENT_HOLD_MS } from '../reservation-hold';

export interface PaymentSummary {
  status: PaymentStatus;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  currency: string;
  invoiceNumber: string | null;
  paidAt: Date | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

/** Forme renvoyée au frontend : à plat, sans mot de passe ni relations imbriquées. */
export class ReservationResponseDto {
  id: number;
  seatId: number;
  seatLabel: string;
  spaceId: number;
  spaceName: string;
  userId: number;
  userName: string;
  userEmail: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  createdAt: Date;
  /** Fin du délai de paiement (uniquement si PENDING_PAYMENT) */
  paymentDeadline: Date | null;
  /** null pour un espace gratuit */
  payment: PaymentSummary | null;

  static from(r: Reservation): ReservationResponseDto {
    const p = r.payment;
    return {
      id: r.id,
      seatId: r.seatId,
      seatLabel: r.seat?.label,
      spaceId: r.seat?.spaceId,
      spaceName: r.seat?.space?.name,
      userId: r.userId,
      userName: r.user?.fullName,
      userEmail: r.user?.email,
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status,
      createdAt: r.createdAt,
      paymentDeadline:
        r.status === ReservationStatus.PENDING_PAYMENT
          ? new Date(new Date(r.createdAt).getTime() + PAYMENT_HOLD_MS)
          : null,
      payment: p
        ? {
            status: p.status,
            amountHT: p.amountHT,
            vatAmount: p.vatAmount,
            amountTTC: p.amountTTC,
            currency: p.currency,
            invoiceNumber: p.invoiceNumber,
            paidAt: p.paidAt,
            cardBrand: p.cardBrand,
            cardLast4: p.cardLast4,
          }
        : null,
    };
  }
}
