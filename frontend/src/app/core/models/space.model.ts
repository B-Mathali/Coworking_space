export interface Space {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  planWidth: number;
  planHeight: number;
  isActive: boolean;
  imageUrl?: string | null;
  createdAt?: string;
  seatCount?: number;
}

export type SpacePayload = Partial<
  Pick<Space, 'name' | 'description' | 'location' | 'planWidth' | 'planHeight' | 'isActive'>
>;

/** Statut calculأ© par le backend pour le crأ©neau demandأ©. */
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

