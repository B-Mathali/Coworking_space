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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

@ApiTags('spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.spaces.findAll(user.role !== Role.ADMIN);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.spaces.findOne(id, user.role !== Role.ADMIN);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSpaceDto) {
    return this.spaces.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpaceDto) {
    return this.spaces.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.spaces.remove(id);
  }
}
