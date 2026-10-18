export interface Space {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  planWidth: number;
  planHeight: number;
  isActive: boolean;
  createdAt?: string;
  seatCount?: number;
}

export type SpacePayload = Partial<
  Pick<Space, 'name' | 'description' | 'location' | 'planWidth' | 'planHeight' | 'isActive'>
>;

/** Statut calculé par le backend pour le créneau demandé. */
export type SeatStatus = 'AVAILABLE' | 'TAKEN' | 'MINE' | 'DISABLED';

export interface SeatAvailability {
  id: number;
  label: string;
  posX: number;
  posY: number;
  isActive: boolean;
  status: SeatStatus;
  reservationId?: number;
  reservedBy?: string;
}

export interface Slot {
  start: Date;
  end: Date;
}
