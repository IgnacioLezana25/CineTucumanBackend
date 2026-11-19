import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';

const CARPETA_POR_DEFECTO = 'uploads';

export function carpetaDeSubidas(configuracion: ConfigService): string {
  return resolve(
    process.cwd(),
    configuracion.get<string>('UPLOADS_DIR') ?? CARPETA_POR_DEFECTO,
  );
}
