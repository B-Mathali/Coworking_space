import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Payment } from '../payments/entities/payment.entity';
import { StripeModule } from '../payments/stripe.module';
import { Seat } from '../seats/entities/seat.entity';
import { Space } from '../spaces/entities/space.entity';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Seat, Space, Payment]), StripeModule, NotificationsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService, TypeOrmModule],
})
export class ReservationsModule {}
