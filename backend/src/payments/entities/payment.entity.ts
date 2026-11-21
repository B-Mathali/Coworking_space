import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum PaymentStatus {
  /** Session Stripe ouverte ou pas encore créée */
  PENDING = 'PENDING',
  PAID = 'PAID',
  /** Délai de paiement dépassé : la place a été libérée */
  EXPIRED = 'EXPIRED',
  /** Réservation annulée avant paiement */
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

const money = { type: 'decimal' as const, precision: 10, scale: 2, transformer: decimalTransformer };

/** Un paiement par réservation payante ; porte aussi les données de la facture. */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  reservationId: number;

  @OneToOne(() => Reservation, (r) => r.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  /** Figés au moment de la réservation : un changement de tarif ne modifie pas les factures. */
  @Column(money)
  unitPrice: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, transformer: decimalTransformer })
  hours: number;

  @Column(money)
  amountHT: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, transformer: decimalTransformer })
  vatRate: number;

  @Column(money)
  vatAmount: number;

  @Column(money)
  amountTTC: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripeSessionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  cardBrand: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  cardLast4: string | null;

  /** Attribué au paiement : FAC-2026-000042 */
  @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
  invoiceNumber: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  paidAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}
