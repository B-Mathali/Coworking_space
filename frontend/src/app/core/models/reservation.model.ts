export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';

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
}

export interface CreateReservationPayload {
  seatId: number;
  startTime: string;
  endTime: string;
}

export interface ReservationFilter {
  spaceId?: number | null;
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
}
