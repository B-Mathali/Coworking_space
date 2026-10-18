import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(user.id, dto);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.reservations.findMine(user.id);
  }

  /** Annule une réservation (la sienne ; l'admin peut aussi passer par /admin/reservations/:id). */
  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.reservations.cancel(id, user);
  }
}
