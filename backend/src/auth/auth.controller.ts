import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    void this.passwordReset.requestReset(dto.email);
    return { message: 'Si un compte existe avec cet email, un lien de réinitialisation vient d’être envoyé.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordReset.reset(dto.token, dto.password);
    return { message: 'Votre mot de passe a été modifié.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
