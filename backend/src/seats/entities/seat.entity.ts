import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Space } from '../../spaces/entities/space.entity';

@Entity('seats')
@Index(['spaceId', 'label'], { unique: true })
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nom affiché sur le plan : A1, B3… */
  @Column()
  label: string;

  @Column({ type: 'int' })
  posX: number;

  @Column({ type: 'int' })
  posY: number;

  /** false = place en maintenance, non réservable */
  @Column({ default: true })
  isActive: boolean;

  @Column()
  spaceId: number;

  @ManyToOne(() => Space, (space) => space.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spaceId' })
  space: Space;

  @OneToMany(() => Reservation, (r) => r.seat)
  reservations: Reservation[];
}
