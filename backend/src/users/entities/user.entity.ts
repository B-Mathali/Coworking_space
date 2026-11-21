import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  /** select:false → jamais chargé par défaut, évite de fuiter le hash */
  @Column({ select: false })
  password: string;

  /** Les jetons JWT émis avant cette date ne sont plus acceptés */
  @Column({ type: 'datetime', precision: 3, nullable: true, select: false })
  passwordChangedAt: Date | null;

  /** Empreinte SHA-256 du jeton envoyé par email : le jeton lui-même n'est jamais stocké */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  @Index()
  resetTokenHash: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, select: false })
  resetTokenExpiresAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, select: false })
  resetTokenIssuedAt: Date | null;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;
}
