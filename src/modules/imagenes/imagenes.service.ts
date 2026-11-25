import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArchivoSubido } from './archivo-subido.types.js';
import { carpetaDeSubidas } from './carpeta-de-subidas.util.js';
import { detectarTipoDeImagen } from './tipo-de-imagen.util.js';

export type CarpetaDeImagenes = 'peliculas' | 'sucursales';

@Injectable()
export class ImagenesService {
  private readonly raiz: string;

  constructor(configuracion: ConfigService) {
    this.raiz = carpetaDeSubidas(configuracion);
  }

  async guardar(
    carpeta: CarpetaDeImagenes,
    nombreBase: string,
    archivo?: ArchivoSubido,
  ): Promise<string> {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException(
        'Falta el archivo. Enviá la imagen en el campo "archivo" de un formulario multipart/form-data.',
      );
    }

    const extension = detectarTipoDeImagen(archivo.buffer);

    if (!extension) {
      throw new BadRequestException(
        'El archivo no es una imagen válida. Se aceptan JPG, PNG y WebP.',
      );
    }

    const nombre = `${nombreBase}-${randomBytes(6).toString('hex')}.${extension}`;

    await mkdir(join(this.raiz, carpeta), { recursive: true });
    await writeFile(join(this.raiz, carpeta, nombre), archivo.buffer);

    return nombre;
  }

  async eliminar(
    carpeta: CarpetaDeImagenes,
    nombre: string | null,
  ): Promise<void> {
    if (!nombre || basename(nombre) !== nombre) {
      return;
    }

    await rm(join(this.raiz, carpeta, nombre), { force: true }).catch(
      () => undefined,
    );
  }
}
