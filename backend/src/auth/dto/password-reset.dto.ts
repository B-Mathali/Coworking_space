import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(64, 64, { message: 'Lien invalide ou expiré.' })
  token: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}
