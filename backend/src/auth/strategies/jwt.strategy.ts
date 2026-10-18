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

  /** Relit l'utilisateur en base : un compte désactivé ou rétrogradé perd l'accès immédiatement. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub).catch(() => null);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return { id: user.id, email: user.email, role: user.role };
  }
}
