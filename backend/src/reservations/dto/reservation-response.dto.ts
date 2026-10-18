import { Reservation, ReservationStatus } from '../entities/reservation.entity';

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

  static from(r: Reservation): ReservationResponseDto {
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
    };
  }
}
