import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AuthUser } from '../decorators/current-user.decorator';

interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  /** Date d'émission, en secondes */
  iat: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  /**
   * Relit l'utilisateur en base : un compte désactivé ou rétrogradé perd l'accès immédiatement,
   * et un changement de mot de passe déconnecte les sessions ouvertes avant lui.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findForAuth(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    const changedAt = user.passwordChangedAt;
    if (changedAt && Math.floor(new Date(changedAt).getTime() / 1000) > payload.iat) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
