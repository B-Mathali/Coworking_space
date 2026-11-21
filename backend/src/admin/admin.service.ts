import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { PasswordResetService } from '../auth/password-reset.service';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Seat } from '../seats/entities/seat.entity';
import { Space } from '../spaces/entities/space.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface AdminStats {
  totalUsers: number;
  totalSpaces: number;
  totalSeats: number;
  activeSeats: number;
  reservationsToday: number;
  upcomingReservations: number;
  currentlyOccupied: number;
  occupancyRate: number; // 0..100
  last7Days: { date: string; count: number }[];
  /** Paiements encaissés (TTC), remboursements exclus */
  revenueThisMonth: number;
  revenueTotal: number;
  currency: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Space) private readonly spaces: Repository<Space>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly usersService: UsersService,
    private readonly passwordReset: PasswordResetService,
    private readonly config: ConfigService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const confirmed = () =>
      this.reservations
        .createQueryBuilder('r')
        .where('r.status = :s', { s: ReservationStatus.CONFIRMED });

    const [totalUsers, totalSpaces, totalSeats, activeSeats] = await Promise.all([
      this.users.count(),
      this.spaces.count(),
      this.seats.count(),
      this.seats.count({ where: { isActive: true } }),
    ]);

    const reservationsToday = await confirmed()
      .andWhere('r.startTime >= :a AND r.startTime < :b', { a: startOfDay, b: endOfDay })
      .getCount();
    const upcomingReservations = await confirmed()
      .andWhere('r.startTime > :now', { now })
      .getCount();
    const currentlyOccupied = await confirmed()
      .andWhere('r.startTime <= :now AND r.endTime > :now', { now })
      .getCount();

    // Réservations par jour sur les 7 derniers jours (jours sans résa = 0)
    const from = new Date(startOfDay);
    from.setDate(from.getDate() - 6);
    // Regroupement fait en JavaScript (et non en SQL) : fonctionne à l'identique sur MySQL, MariaDB ou PostgreSQL.
    const recent = await this.reservations.find({
      where: { status: ReservationStatus.CONFIRMED, startTime: MoreThanOrEqual(from) },
      select: { id: true, startTime: true },
    });
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const counts = new Map<string, number>();
    for (const r of recent) {
      const key = dayKey(new Date(r.startTime));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = dayKey(d);
      return { date: key, count: counts.get(key) ?? 0 };
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenue = (since?: Date) => {
      const qb = this.payments
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amountTTC), 0)', 'sum')
        .where('p.status = :paid', { paid: PaymentStatus.PAID });
      if (since) qb.andWhere('p.paidAt >= :since', { since });
      return qb.getRawOne<{ sum: string }>().then((r) => parseFloat(r?.sum ?? '0'));
    };
    const [revenueThisMonth, revenueTotal] = await Promise.all([revenue(startOfMonth), revenue()]);

    return {
      totalUsers,
      totalSpaces,
      totalSeats,
      activeSeats,
      reservationsToday,
      upcomingReservations,
      currentlyOccupied,
      occupancyRate: activeSeats ? Math.round((currentlyOccupied / activeSeats) * 100) : 0,
      last7Days,
      revenueThisMonth,
      revenueTotal,
      currency: this.config.get<string>('billing.currency')!,
    };
  }

  async listUsers() {
    const [users, counts] = await Promise.all([
      this.usersService.findAll(),
      this.reservations
        .createQueryBuilder('r')
        .select('r.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('r.status = :s', { s: ReservationStatus.CONFIRMED })
        .groupBy('r.userId')
        .getRawMany<{ userId: number; count: string }>(),
    ]);
    const byUser = new Map(counts.map((c) => [Number(c.userId), Number(c.count)]));
    return users.map((u) => ({ ...u, reservationCount: byUser.get(u.id) ?? 0 }));
  }

  /** Le mot de passe initial est aléatoire et jamais communiqué : l'utilisateur choisit le sien via l'invitation. */
  async createUser(dto: CreateUserDto) {
    const user = await this.usersService.create({ ...dto, password: randomBytes(32).toString('hex') });
    return { user, emailSent: await this.passwordReset.sendInvitation(user) };
  }

  async sendPasswordReset(id: number) {
    const user = await this.usersService.findById(id);
    if (!user.isActive) throw new BadRequestException('Ce compte est désactivé.');
    return { emailSent: await this.passwordReset.sendResetLink(user) };
  }

  /** Garde-fou : un admin ne peut pas se retirer ses propres droits ni se désactiver. */
  async updateUser(adminId: number, id: number, dto: UpdateUserDto) {
    if (id === adminId && (dto.role !== undefined || dto.isActive === false)) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle ou statut.');
    }
    return this.usersService.update(id, dto);
  }

  async removeUser(adminId: number, id: number) {
    if (id === adminId) throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte.');
    await this.usersService.remove(id);
  }
}
