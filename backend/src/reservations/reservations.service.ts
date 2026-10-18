import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReservationConflictException } from '../common/exceptions/reservation-conflict.exception';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { Seat } from '../seats/entities/seat.entity';
import { Space } from '../spaces/entities/space.entity';
import { Role } from '../users/entities/user.entity';
import { CreateReservationDto, ReservationFilterDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { Reservation, ReservationStatus } from './entities/reservation.entity';

const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // 12 h max par réservation
const CLOCK_TOLERANCE_MS = 60 * 1000;

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation) private readonly repo: Repository<Reservation>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Réserve une place. Tout se passe dans UNE transaction :
   * 1) on verrouille la ligne de la place (pessimistic_write) → deux clics simultanés sur la même
   *    place sont sérialisés, le second verra la réservation du premier ;
   * 2) on vérifie le chevauchement sur cette place ;
   * 3) on vérifie que l'utilisateur n'occupe pas déjà une autre place sur le même créneau.
   */
  async create(userId: number, dto: CreateReservationDto): Promise<ReservationResponseDto> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    this.validateSlot(start, end);

    const id = await this.dataSource.transaction(async (m) => {
      const seat = await m.findOne(Seat, {
        where: { id: dto.seatId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!seat) throw new ResourceNotFoundException('Place');
      if (!seat.isActive) throw new BadRequestException('Cette place est désactivée.');

      const space = await m.findOne(Space, { where: { id: seat.spaceId } });
      if (!space?.isActive) throw new BadRequestException("Cet espace n'est pas ouvert à la réservation.");

      const overlap = (alias: string) =>
        `${alias}.status = :status AND ${alias}.startTime < :end AND ${alias}.endTime > :start`;
      const params = { status: ReservationStatus.CONFIRMED, start, end };

      const seatTaken = await m
        .createQueryBuilder(Reservation, 'r')
        .where('r.seatId = :seatId', { seatId: seat.id })
        .andWhere(overlap('r'), params)
        .getExists();
      if (seatTaken) throw new ReservationConflictException();

      const userBusy = await m
        .createQueryBuilder(Reservation, 'r')
        .where('r.userId = :userId', { userId })
        .andWhere(overlap('r'), params)
        .getExists();
      if (userBusy) {
        throw new ReservationConflictException('Vous avez déjà une place réservée sur ce créneau.');
      }

      const saved = await m.save(
        Reservation,
        m.create(Reservation, { userId, seatId: seat.id, startTime: start, endTime: end }),
      );
      return saved.id;
    });

    return this.findOneDto(id);
  }

  async findMine(userId: number) {
    const list = await this.baseQuery()
      .where('r.userId = :userId', { userId })
      .orderBy('r.startTime', 'DESC')
      .getMany();
    return list.map(ReservationResponseDto.from);
  }

  /** Liste admin avec filtres optionnels. */
  async findAll(filter: ReservationFilterDto) {
    const qb = this.baseQuery().orderBy('r.startTime', 'DESC');
    if (filter.spaceId) qb.andWhere('seat.spaceId = :spaceId', { spaceId: filter.spaceId });
    if (filter.userId) qb.andWhere('r.userId = :userId', { userId: filter.userId });
    if (filter.status) qb.andWhere('r.status = :status', { status: filter.status });
    if (filter.from) qb.andWhere('r.endTime >= :from', { from: new Date(filter.from) });
    if (filter.to) qb.andWhere('r.startTime <= :to', { to: new Date(filter.to) });
    return (await qb.getMany()).map(ReservationResponseDto.from);
  }

  /** Annulation : le propriétaire ou un admin. On garde la trace (statut CANCELLED). */
  async cancel(id: number, requester: { id: number; role: Role }) {
    const resa = await this.repo.findOne({ where: { id } });
    if (!resa) throw new ResourceNotFoundException('Réservation');
    if (resa.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException("Vous ne pouvez annuler que vos propres réservations.");
    }
    if (resa.status === ReservationStatus.CANCELLED) return this.findOneDto(id);
    resa.status = ReservationStatus.CANCELLED;
    await this.repo.save(resa);
    return this.findOneDto(id);
  }

  // ---------- helpers ----------

  private validateSlot(start: Date, end: Date) {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Dates invalides.');
    }
    if (end <= start) throw new BadRequestException('La fin doit être après le début.');
    if (start.getTime() < Date.now() - CLOCK_TOLERANCE_MS) {
      throw new BadRequestException('Impossible de réserver dans le passé.');
    }
    if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException('Une réservation ne peut pas dépasser 12 heures.');
    }
  }

  private baseQuery() {
    return this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.seat', 'seat')
      .leftJoinAndSelect('seat.space', 'space')
      .leftJoinAndSelect('r.user', 'user');
  }

  private async findOneDto(id: number) {
    const resa = await this.baseQuery().where('r.id = :id', { id }).getOne();
    if (!resa) throw new ResourceNotFoundException('Réservation');
    return ReservationResponseDto.from(resa);
  }
}
