import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { BookingNotificationsService } from './booking-notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Reservation, User]), MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, BookingNotificationsService],
  exports: [BookingNotificationsService],
})
export class NotificationsModule {}
