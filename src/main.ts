import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module.js';

const PUERTO_POR_DEFECTO = 3100;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuracion = app.get(ConfigService);
  const puerto = configuracion.get<number>('PORT') ?? PUERTO_POR_DEFECTO;

  await app.listen(puerto);
}
await bootstrap();
