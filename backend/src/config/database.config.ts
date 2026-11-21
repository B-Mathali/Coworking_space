import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mysql', // fonctionne avec MySQL et MariaDB (XAMPP)
    connectorPackage: 'mysql2',
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    username: config.get<string>('database.username'),
    password: config.get<string>('database.password'),
    database: config.get<string>('database.name'),
    charset: 'utf8mb4',
    // Les dates sont stockées et relues en UTC : évite tout décalage d'heure
    timezone: 'Z',
    autoLoadEntities: true,
    // true uniquement en développement : TypeORM crée/adapte les tables tout seul
    synchronize: config.get<boolean>('database.synchronize'),
  }),
};
