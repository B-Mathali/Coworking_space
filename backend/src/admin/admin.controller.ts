import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReservationFilterDto } from '../reservations/dto/create-reservation.dto';
import { ReservationsService } from '../reservations/reservations.service';
import { Role } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';

/** Toutes les routes /admin/* exigent un JWT valide ET le rôle ADMIN. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly reservations: ReservationsService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.getStats();
  }

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(me.id, id, dto);
  }

  @Delete('users/:id')
  @HttpCode(204)
  removeUser(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.admin.removeUser(me.id, id);
  }

  @Get('reservations')
  reservationsList(@Query() filter: ReservationFilterDto) {
    return this.reservations.findAll(filter);
  }

  @Delete('reservations/:id')
  cancelReservation(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.reservations.cancel(id, me);
  }
}
