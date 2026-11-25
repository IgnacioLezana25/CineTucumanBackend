import { join } from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './modules/app/app.module.js';
import { carpetaDeSubidas } from './modules/imagenes/carpeta-de-subidas.util.js';

const PUERTO_POR_DEFECTO = 4000;
const FRONTEND_POR_DEFECTO = 'http://localhost:5173';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configuracion = app.get(ConfigService);
  const puerto = configuracion.get<number>('PORT') ?? PUERTO_POR_DEFECTO;
  const urlBase =
    configuracion.get<string>('API_BASE_URL') ?? `http://localhost:${puerto}/`;
  const origenesPermitidos = (
    configuracion.get<string>('FRONTEND_URL') ?? FRONTEND_POR_DEFECTO
  )
    .split(',')
    .map((origen) => origen.trim());

  app.enableCors({ origin: origenesPermitidos, credentials: true });
  app.useStaticAssets(join(process.cwd(), 'public'));
  app.useStaticAssets(carpetaDeSubidas(configuracion), {
    prefix: '/imagenes/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(puerto);
  Logger.log(`API escuchando en ${urlBase}`, 'Bootstrap');
}
await bootstrap();
