import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Seat } from '../seats/entities/seat.entity';
import { Space } from '../spaces/entities/space.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
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
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Space) private readonly spaces: Repository<Space>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    private readonly usersService: UsersService,
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
    };
  }

  listUsers() {
    return this.usersService.findAll();
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
