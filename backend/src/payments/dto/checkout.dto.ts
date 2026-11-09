import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches } from 'class-validator';

export class CheckoutDto {
  @ApiProperty()
  @IsInt()
  reservationId: number;
}

export class ConfirmPaymentDto {
  @ApiProperty({ example: 'cs_test_a1B2c3…' })
  @IsString()
  @Matches(/^cs_[A-Za-z0-9_]+$/, { message: 'Identifiant de session Stripe invalide.' })
  sessionId: string;
}
