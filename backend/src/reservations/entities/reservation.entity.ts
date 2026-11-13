import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Seat } from '../../seats/entities/seat.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  /** Espace payant : la place est bloquée le temps du paiement Stripe */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
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

  /** Évite d'envoyer deux fois le rappel avant le début du créneau */
  @Column({ type: 'datetime', precision: 3, nullable: true })
  reminderSentAt: Date | null;

  @CreateDateColumn({ type: 'datetime', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
  createdAt: Date;

  /** Absent pour un espace gratuit */
  @OneToOne(() => Payment, (p) => p.reservation)
  payment?: Payment | null;
}
