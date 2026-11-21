import { ConflictException } from '@nestjs/common';

export class ReservationConflictException extends ConflictException {
  constructor(message = 'Cette place est déjà réservée sur ce créneau.') {
    super(message);
  }
}
