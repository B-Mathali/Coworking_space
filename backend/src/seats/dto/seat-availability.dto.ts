import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class SeatAvailabilityQueryDto {
  @ApiPropertyOptional({ example: '2026-10-20T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({ example: '2026-10-20T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  end?: string;
}

export type SeatStatus = 'AVAILABLE' | 'TAKEN' | 'MINE' | 'DISABLED';

export interface SeatAvailability {
  id: number;
  label: string;
  posX: number;
  posY: number;
  isActive: boolean;
  status: SeatStatus;
  /** Présent si la place est à moi (pour annuler) ou si l'appelant est admin */
  reservationId?: number;
  /** Visible uniquement par l'admin */
  reservedBy?: string;
}
