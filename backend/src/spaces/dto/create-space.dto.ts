import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @ApiPropertyOptional({ default: 800 })
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(2000)
  planWidth?: number;

  @ApiPropertyOptional({ default: 500 })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(1500)
  planHeight?: number;

  /** Prix HT par heure (0 = gratuit). @Type : arrive en texte quand le formulaire est en multipart. */
  @ApiPropertyOptional({ default: 0, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  pricePerHour?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
