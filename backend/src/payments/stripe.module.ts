import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';

/** Module à part : utilisé à la fois par les réservations (remboursement) et les paiements. */
@Module({
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
