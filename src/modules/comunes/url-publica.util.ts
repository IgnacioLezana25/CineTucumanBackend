import { ConfigService } from '@nestjs/config';

const PUERTO_POR_DEFECTO = 4000;

export function urlBaseDeLaApi(configuracion: ConfigService): string {
  const puerto = configuracion.get<number>('PORT') ?? PUERTO_POR_DEFECTO;
  const urlBase =
    configuracion.get<string>('API_BASE_URL') ?? `http://localhost:${puerto}/`;

  return urlBase.replace(/\/+$/, '');
}

export function urlDeImagen(
  urlBase: string,
  carpeta: string,
  archivo: string,
): string {
  return `${urlBase}/imagenes/${carpeta}/${encodeURIComponent(archivo)}`;
}
