import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Seat } from '../../seats/entities/seat.entity';

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
imageUrl: string | null;

  /** Dimensions (en px) du plan dessiné par l'admin */
  @Column({ type: 'int', default: 800 })
  planWidth: number;

  @Column({ type: 'int', default: 500 })
  planHeight: number;

  /** Prix HT par heure ; 0 = réservation gratuite (pas de paiement) */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer })
  pricePerHour: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @OneToMany(() => Seat, (seat) => seat.space)
  seats: Seat[];

  /** Calculé à la volée (loadRelationCountAndMap), non stocké */
  seatCount?: number;
}
