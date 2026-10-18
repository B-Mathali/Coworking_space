import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Seat } from '../../seats/entities/seat.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('reservations')
@Index(['seatId', 'startTime', 'endTime'])
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  seatId: number;

  @ManyToOne(() => Seat, (seat) => seat.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatId' })
  seat: Seat;

  @Column({ type: 'datetime', precision: 3 })
  startTime: Date;

  @Column({ type: 'datetime', precision: 3 })
  endTime: Date;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.CONFIRMED })
  status: ReservationStatus;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}
