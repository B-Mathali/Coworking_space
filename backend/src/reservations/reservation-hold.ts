import { ReservationStatus } from './entities/reservation.entity';

/** Une réservation en attente de paiement bloque la place pendant ce délai. */
export const PAYMENT_HOLD_MS = 30 * 60 * 1000;

/**
 * Condition SQL « cette réservation occupe la place » : confirmée, ou en attente de paiement
 * et encore dans le délai. À combiner avec le filtre de chevauchement.
 */
export function activeReservation(alias: string) {
  return {
    sql: `(${alias}.status = :activeConfirmed OR (${alias}.status = :activePending AND ${alias}.createdAt > :holdSince))`,
    params: {
      activeConfirmed: ReservationStatus.CONFIRMED,
      activePending: ReservationStatus.PENDING_PAYMENT,
      holdSince: new Date(Date.now() - PAYMENT_HOLD_MS),
    },
  };
}
