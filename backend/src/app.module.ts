import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { databaseConfig } from './config/database.config';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SeatsModule } from './seats/seats.module';
import { SpacesModule } from './spaces/spaces.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync(databaseConfig),
    UsersModule,
    AuthModule,
    SpacesModule,
    SeatsModule,
    ReservationsModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
  ],
})
export class AppModule {}
