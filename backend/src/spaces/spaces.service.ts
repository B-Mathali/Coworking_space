import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space } from './entities/space.entity';

@Injectable()
export class SpacesService {
  constructor(@InjectRepository(Space) private readonly repo: Repository<Space>) {}

  /** onlyActive = true pour les utilisateurs, false pour l'admin */
  findAll(onlyActive: boolean) {
    const qb = this.repo
      .createQueryBuilder('space')
      .loadRelationCountAndMap('space.seatCount', 'space.seats')
      .orderBy('space.name', 'ASC');
    if (onlyActive) qb.where('space.isActive = true');
    return qb.getMany();
  }

  async findOne(id: number, onlyActive = false) {
    const space = await this.repo.findOne({ where: { id } });
    if (!space || (onlyActive && !space.isActive)) throw new ResourceNotFoundException('Espace');
    return space;
  }

  create(dto: CreateSpaceDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateSpaceDto) {
    const space = await this.findOne(id);
    Object.assign(space, dto);
    return this.repo.save(space);
  }

  async remove(id: number) {
    const space = await this.findOne(id);
    await this.repo.remove(space); // places et réservations supprimées en cascade
  }
}
