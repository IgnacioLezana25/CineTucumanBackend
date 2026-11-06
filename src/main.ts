import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module.js';

const PUERTO_POR_DEFECTO = 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuracion = app.get(ConfigService);
  const puerto = configuracion.get<number>('PORT') ?? PUERTO_POR_DEFECTO;
  const urlBase =
    configuracion.get<string>('API_BASE_URL') ?? `http://localhost:${puerto}/`;

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(puerto);
  Logger.log(`API escuchando en ${urlBase}`, 'Bootstrap');
}
await bootstrap();
