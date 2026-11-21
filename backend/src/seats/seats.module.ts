import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Space } from '../spaces/entities/space.entity';
import { Seat } from './entities/seat.entity';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, Space, Reservation])],
  controllers: [SeatsController],
  providers: [SeatsService],
  exports: [SeatsService, TypeOrmModule],
})
export class SeatsModule {}
