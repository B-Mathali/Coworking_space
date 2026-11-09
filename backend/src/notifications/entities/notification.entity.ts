import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_REFUNDED = 'BOOKING_REFUNDED',
  BOOKING_EXPIRED = 'BOOKING_EXPIRED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  ADMIN_BOOKING_CREATED = 'ADMIN_BOOKING_CREATED',
  ADMIN_BOOKING_CANCELLED = 'ADMIN_BOOKING_CANCELLED',
}

/**
 * Pas d'index composite (userId, readAt) : sur MariaDB, TypeORM croit à chaque démarrage que les colonnes
 * nullables ont changé et tente de supprimer l'index, ce qui échoue car il sert à la clé étrangère.
 * L'index créé automatiquement pour la clé étrangère sur userId suffit à ces requêtes par utilisateur.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 500 })
  message: string;

  /** Sans clé étrangère : la notification reste lisible si la réservation est supprimée avec sa place */
  @Column({ type: 'int', nullable: true })
  reservationId: number | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}
