
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(
    '/uploads',
    express.static(join(process.cwd(), 'uploads')),
  );

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<string>('frontendUrl'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  console.log(
    `API prête : http://localhost:${port}/api (docs : /api/docs)`,
  );
  console.log(
    `Images accessibles : http://localhost:${port}/uploads/`,
  );
}

bootstrap();
