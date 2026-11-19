import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client.js';
import { urlBaseDeLaApi, urlDeImagen } from '../comunes/url-publica.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PRISMA_CLAVE_FORANEA,
  PRISMA_CLAVE_UNICA,
  PRISMA_NO_ENCONTRADO,
  codigoDeError,
} from '../prisma/prisma-error.util.js';
import { CreatePeliculaDto } from './dto/create-pelicula.dto.js';
import { FiltrarPeliculasDto } from './dto/filtrar-peliculas.dto.js';
import { UpdatePeliculaDto } from './dto/update-pelicula.dto.js';
import { Pelicula } from './entities/pelicula.entity.js';

const INCLUIR_RELACIONES = {
  clasificacion: true,
  generos: { include: { genero: true }, orderBy: { generoId: 'asc' } },
} satisfies Prisma.PeliculaInclude;

type PeliculaConRelaciones = Prisma.PeliculaGetPayload<{
  include: typeof INCLUIR_RELACIONES;
}>;

@Injectable()
export class PeliculasService {
  private readonly urlBase: string;

  constructor(
    private readonly prisma: PrismaService,
    configuracion: ConfigService,
  ) {
    this.urlBase = urlBaseDeLaApi(configuracion);
  }

  async create(createPeliculaDto: CreatePeliculaDto): Promise<Pelicula> {
    const { generoIds, fechaEstreno, ...datos } = createPeliculaDto;

    try {
      const pelicula = await this.prisma.pelicula.create({
        data: {
          ...datos,
          tituloOriginal: datos.tituloOriginal ?? null,
          sinopsis: datos.sinopsis ?? null,
          duracionMinutos: datos.duracionMinutos ?? null,
          clasificacionId: datos.clasificacionId ?? null,
          trailerYoutube: datos.trailerYoutube ?? null,
          director: datos.director ?? null,
          paisOrigen: datos.paisOrigen ?? null,
          fechaEstreno: this.convertirFecha(fechaEstreno) ?? null,
          generos: {
            create: (generoIds ?? []).map((generoId) => ({ generoId })),
          },
        },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(pelicula);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async findAll(filtros: FiltrarPeliculasDto = {}): Promise<Pelicula[]> {
    const peliculas = await this.prisma.pelicula.findMany({
      where: {
        estado: filtros.estado,
        destacada:
          filtros.destacada === undefined
            ? undefined
            : filtros.destacada === 'true',
        titulo: filtros.q
          ? { contains: filtros.q, mode: 'insensitive' }
          : undefined,
      },
      include: INCLUIR_RELACIONES,
      orderBy: { id: 'asc' },
    });

    return peliculas.map((pelicula) => this.presentar(pelicula));
  }

  async findOne(id: number): Promise<Pelicula> {
    const pelicula = await this.prisma.pelicula.findUnique({
      where: { id },
      include: INCLUIR_RELACIONES,
    });

    if (!pelicula) {
      throw new NotFoundException(`No existe una película con id ${id}.`);
    }

    return this.presentar(pelicula);
  }

  async findBySlug(slug: string): Promise<Pelicula> {
    const pelicula = await this.prisma.pelicula.findUnique({
      where: { slug },
      include: INCLUIR_RELACIONES,
    });

    if (!pelicula) {
      throw new NotFoundException(`No existe una película con slug ${slug}.`);
    }

    return this.presentar(pelicula);
  }

  async update(
    id: number,
    updatePeliculaDto: UpdatePeliculaDto,
  ): Promise<Pelicula> {
    const { generoIds, fechaEstreno, ...datos } = updatePeliculaDto;

    try {
      const pelicula = await this.prisma.pelicula.update({
        where: { id },
        data: {
          ...datos,
          slug: datos.slug ?? undefined,
          titulo: datos.titulo ?? undefined,
          estado: datos.estado ?? undefined,
          destacada: datos.destacada ?? undefined,
          posterArchivo: datos.posterArchivo ?? undefined,
          fechaEstreno: this.convertirFecha(fechaEstreno),
          generos: generoIds
            ? {
                deleteMany: {},
                create: generoIds.map((generoId) => ({ generoId })),
              }
            : undefined,
        },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(pelicula);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una película con id ${id}.`);
      }

      throw this.traducirError(error);
    }
  }

  async remove(id: number): Promise<Pelicula> {
    try {
      const pelicula = await this.prisma.pelicula.delete({
        where: { id },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(pelicula);
    } catch (error) {
      const codigo = codigoDeError(error);

      if (codigo === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una película con id ${id}.`);
      }

      if (codigo === PRISMA_CLAVE_FORANEA) {
        throw new ConflictException(
          'No se puede eliminar la película porque tiene funciones.',
        );
      }

      throw error;
    }
  }

  private convertirFecha(fecha: string | null | undefined) {
    if (fecha === undefined || fecha === null) return fecha;

    return new Date(`${fecha}T00:00:00.000Z`);
  }

  private traducirError(error: unknown) {
    const codigo = codigoDeError(error);

    if (codigo === PRISMA_CLAVE_UNICA) {
      return new ConflictException('Ya existe una película con ese slug.');
    }

    if (codigo === PRISMA_CLAVE_FORANEA) {
      return new BadRequestException(
        'La clasificación o alguno de los géneros no existe.',
      );
    }

    return error;
  }

  private presentar(pelicula: PeliculaConRelaciones): Pelicula {
    return {
      id: pelicula.id,
      slug: pelicula.slug,
      titulo: pelicula.titulo,
      tituloOriginal: pelicula.tituloOriginal,
      sinopsis: pelicula.sinopsis,
      duracionMinutos: pelicula.duracionMinutos,
      clasificacionId: pelicula.clasificacionId,
      clasificacion: pelicula.clasificacion?.nombre ?? null,
      estado: pelicula.estado,
      destacada: pelicula.destacada,
      fechaEstreno: pelicula.fechaEstreno
        ? pelicula.fechaEstreno.toISOString().slice(0, 10)
        : null,
      posterArchivo: pelicula.posterArchivo,
      posterUrl: urlDeImagen(this.urlBase, 'peliculas', pelicula.posterArchivo),
      trailerYoutube: pelicula.trailerYoutube,
      director: pelicula.director,
      paisOrigen: pelicula.paisOrigen,
      generoIds: pelicula.generos.map((relacion) => relacion.generoId),
      generos: pelicula.generos.map((relacion) => relacion.genero.nombre),
    };
  }
}
