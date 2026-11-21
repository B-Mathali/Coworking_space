import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../entities/user.entity';
import { UsersService } from '../users.service';

/** Crée le compte administrateur par défaut au premier démarrage. */
@Injectable()
export class AdminSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeed.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('admin.email')!;
    if (await this.users.findByEmail(email)) return;

    await this.users.create({
      fullName: this.config.get<string>('admin.name')!,
      email,
      password: this.config.get<string>('admin.password')!,
      role: Role.ADMIN,
    });
    this.logger.log(`Compte admin créé : ${email}`);
  }
}
