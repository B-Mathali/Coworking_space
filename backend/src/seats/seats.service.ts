import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Space } from '../spaces/entities/space.entity';
import { BulkCreateSeatsDto, CreateSeatDto } from './dto/create-seat.dto';
import { SeatAvailability, SeatStatus } from './dto/seat-availability.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { Seat } from './entities/seat.entity';

@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(Space) private readonly spaces: Repository<Space>,
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
  ) {}

  /**
   * Cœur du plan dynamique : le statut de chaque place est CALCULÉ pour le créneau demandé.
   * Une réservation chevauche le créneau si  début_résa < fin_demandée  ET  fin_résa > début_demandé.
   */
  async getSeatMap(
    spaceId: number,
    start: Date,
    end: Date,
    userId: number,
    isAdmin: boolean,
  ): Promise<SeatAvailability[]> {
    const space = await this.spaces.findOne({ where: { id: spaceId } });
    if (!space || (!isAdmin && !space.isActive)) throw new ResourceNotFoundException('Espace');
    if (end <= start) throw new BadRequestException('La fin doit être après le début.');

    const seats = await this.seats.find({ where: { spaceId }, order: { label: 'ASC' } });
    if (seats.length === 0) return [];

    const overlapping = await this.reservations
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.seatId IN (:...ids)', { ids: seats.map((s) => s.id) })
      .andWhere('r.status = :status', { status: ReservationStatus.CONFIRMED })
      .andWhere('r.startTime < :end AND r.endTime > :start', { start, end })
      .getMany();
    const bySeat = new Map(overlapping.map((r) => [r.seatId, r]));

    return seats.map((seat) => {
      const resa = bySeat.get(seat.id);
      let status: SeatStatus = 'AVAILABLE';
      if (!seat.isActive) status = 'DISABLED';
      else if (resa) status = resa.userId === userId ? 'MINE' : 'TAKEN';

      const item: SeatAvailability = {
        id: seat.id,
        label: seat.label,
        posX: seat.posX,
        posY: seat.posY,
        isActive: seat.isActive,
        status,
      };
      if (resa && (resa.userId === userId || isAdmin)) item.reservationId = resa.id;
      if (resa && isAdmin) item.reservedBy = resa.user?.fullName;
      return item;
    });
  }

  async create(dto: CreateSeatDto) {
    await this.assertSpace(dto.spaceId);
    await this.assertLabelFree(dto.spaceId, dto.label);
    return this.seats.save(this.seats.create(dto));
  }

  /** Génère A1..A6, B1..B6, … en sautant les étiquettes déjà prises. */
  async bulkCreate(dto: BulkCreateSeatsDto) {
    await this.assertSpace(dto.spaceId);
    const { startX = 60, startY = 60, gapX = 90, gapY = 80 } = dto;
    const existing = new Set(
      (await this.seats.find({ where: { spaceId: dto.spaceId }, select: ['label'] })).map((s) => s.label),
    );

    const toCreate: Seat[] = [];
    for (let r = 0; r < dto.rows; r++) {
      for (let c = 0; c < dto.cols; c++) {
        const label = `${String.fromCharCode(65 + r)}${c + 1}`;
        if (existing.has(label)) continue;
        toCreate.push(
          this.seats.create({
            spaceId: dto.spaceId,
            label,
            posX: startX + c * gapX,
            posY: startY + r * gapY,
          }),
        );
      }
    }
    return this.seats.save(toCreate);
  }

  async update(id: number, dto: UpdateSeatDto) {
    const seat = await this.findOne(id);
    if (dto.label && dto.label !== seat.label) await this.assertLabelFree(seat.spaceId, dto.label);
    Object.assign(seat, dto);
    return this.seats.save(seat);
  }

  async remove(id: number) {
    const seat = await this.findOne(id);
    await this.seats.remove(seat);
  }

  private async findOne(id: number) {
    const seat = await this.seats.findOne({ where: { id } });
    if (!seat) throw new ResourceNotFoundException('Place');
    return seat;
  }

  private async assertSpace(spaceId: number) {
    if (!(await this.spaces.exist({ where: { id: spaceId } }))) {
      throw new ResourceNotFoundException('Espace');
    }
  }

  private async assertLabelFree(spaceId: number, label: string) {
    if (await this.seats.exist({ where: { spaceId, label } })) {
      throw new ConflictException(`La place « ${label} » existe déjà dans cet espace.`);
    }
  }
}
