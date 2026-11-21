import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/entities/user.entity';
import { BulkCreateSeatsDto, CreateSeatDto } from './dto/create-seat.dto';
import { SeatAvailabilityQueryDto } from './dto/seat-availability.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { SeatsService } from './seats.service';

@ApiTags('seats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SeatsController {
  constructor(private readonly seats: SeatsService) {}

  /** Plan d'un espace avec le statut de chaque place pour le créneau [start, end). */
  @Get('spaces/:spaceId/seats')
  getSeatMap(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query() query: SeatAvailabilityQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const start = query.start ? new Date(query.start) : new Date();
    const end = query.end ? new Date(query.end) : new Date(start.getTime() + 60 * 60 * 1000);
    return this.seats.getSeatMap(spaceId, start, end, user.id, user.role === Role.ADMIN);
  }

  @Post('seats')
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSeatDto) {
    return this.seats.create(dto);
  }

  @Post('seats/bulk')
  @Roles(Role.ADMIN)
  bulk(@Body() dto: BulkCreateSeatsDto) {
    return this.seats.bulkCreate(dto);
  }

  @Patch('seats/:id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeatDto) {
    return this.seats.update(id, dto);
  }

  @Delete('seats/:id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seats.remove(id);
  }
}
