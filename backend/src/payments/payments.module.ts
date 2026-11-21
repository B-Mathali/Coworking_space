import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationsModule } from '../reservations/reservations.module';
import { Payment } from './entities/payment.entity';
import { InvoiceService } from './invoice.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeModule } from './stripe.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Reservation]), ReservationsModule, StripeModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}
