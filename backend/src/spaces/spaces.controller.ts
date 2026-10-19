
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';

import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

const uploadDirectory = join(process.cwd(), 'uploads', 'spaces');

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

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
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.spaces.findOne(id, user.role !== Role.ADMIN);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        description: { type: 'string' },
        location: { type: 'string' },
        planWidth: { type: 'number', example: 800 },
        planHeight: { type: 'number', example: 500 },
        isActive: { type: 'boolean', example: true },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          try {
            mkdirSync(uploadDirectory, { recursive: true });
            callback(null, uploadDirectory);
          } catch (error) {
            callback(error as Error, uploadDirectory);
          }
        },
        filename: (_req, file, callback) => {
          callback(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          );
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
      fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Format invalide. Choisissez une image JPG, PNG ou WebP.',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  create(
    @Body() dto: CreateSpaceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file
      ? `/uploads/spaces/${file.filename}`
      : undefined;

    return this.spaces.create(dto, imageUrl);
  }

@Patch(':id')
@Roles(Role.ADMIN)
@ApiConsumes('multipart/form-data')
@UseInterceptors(
  FileInterceptor('image', {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        try {
          mkdirSync(uploadDirectory, { recursive: true });
          callback(null, uploadDirectory);
        } catch (error) {
          callback(error as Error, uploadDirectory);
        }
      },
      filename: (_req, file, callback) => {
        callback(
          null,
          `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
        );
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            'Format invalide. Choisissez une image JPG, PNG ou WebP.',
          ),
          false,
        );
      }

      callback(null, true);
    },
  }),
)
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateSpaceDto,
  @UploadedFile() file?: Express.Multer.File,
) {
  const imageUrl = file
    ? `/uploads/spaces/${file.filename}`
    : undefined;

  return this.spaces.update(id, dto, imageUrl);
}

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.spaces.remove(id);
  }
}
