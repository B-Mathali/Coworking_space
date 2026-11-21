import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSeatDto {
  @IsInt()
  spaceId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  label: string;

  @IsInt()
  @Min(0)
  @Max(5000)
  posX: number;

  @IsInt()
  @Min(0)
  @Max(5000)
  posY: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Génère une grille de places d'un coup (ex. 4 rangées × 6 colonnes). */
export class BulkCreateSeatsDto {
  @IsInt()
  spaceId: number;

  @IsInt()
  @Min(1)
  @Max(26)
  rows: number;

  @IsInt()
  @Min(1)
  @Max(30)
  cols: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startX?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startY?: number;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(40)
  gapX?: number;

  @ApiPropertyOptional({ default: 80 })
  @IsOptional()
  @IsInt()
  @Min(40)
  gapY?: number;
}
