export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface PaymentSummary {
  status: PaymentStatus;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
  currency: string;
  invoiceNumber: string | null;
  paidAt: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

export interface Reservation {
  id: number;
  seatId: number;
  seatLabel: string;
  spaceId: number;
  spaceName: string;
  userId: number;
  userName: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
  /** Fin du délai pour payer (réservation PENDING_PAYMENT) */
  paymentDeadline: string | null;
  /** null pour un espace gratuit */
  payment: PaymentSummary | null;
}

export interface CreateReservationPayload {
  seatId: number;
  startTime: string;
  endTime: string;
}

export interface ReservationFilter {
  spaceId?: number | null;
  userId?: number | null;
  status?: ReservationStatus | '';
  from?: string;
  to?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalSpaces: number;
  totalSeats: number;
  activeSeats: number;
  reservationsToday: number;
  upcomingReservations: number;
  currentlyOccupied: number;
  occupancyRate: number;
  last7Days: { date: string; count: number }[];
  revenueThisMonth: number;
  revenueTotal: number;
  currency: string;
}

export interface BillingConfig {
  currency: string;
  vatRate: number;
}

export interface PaymentConfirmation {
  outcome: 'PAID' | 'REFUNDED' | 'PENDING';
  reservation: Reservation;
}
