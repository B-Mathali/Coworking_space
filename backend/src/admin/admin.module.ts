import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from '../reservations/reservations.module';
import { Seat } from '../seats/entities/seat.entity';
import { Space } from '../spaces/entities/space.entity';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Space, Seat, Reservation]),
    UsersModule,
    ReservationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
