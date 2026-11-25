import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client.js';
import { urlBaseDeLaApi, urlDeImagen } from '../comunes/url-publica.util.js';
import { ArchivoSubido } from '../imagenes/archivo-subido.types.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePeliculaDto } from './dto/create-pelicula.dto.js';
import { FiltrarPeliculasDto } from './dto/filtrar-peliculas.dto.js';
import { UpdatePeliculaDto } from './dto/update-pelicula.dto.js';
import { ActorPelicula, Pelicula } from './entities/pelicula.entity.js';

const INCLUIR_RELACIONES = {
  clasificacion: true,
  generos: { include: { genero: true }, orderBy: { generoId: 'asc' } },
  reparto: { orderBy: { orden: 'asc' } },
} satisfies Prisma.PeliculaInclude;

type PeliculaConRelaciones = Prisma.PeliculaGetPayload<{
  include: typeof INCLUIR_RELACIONES;
}>;

@Injectable()
export class PeliculasService {
  private readonly urlBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly imagenes: ImagenesService,
    configuracion: ConfigService,
  ) {
    this.urlBase = urlBaseDeLaApi(configuracion);
  }

  async create(createPeliculaDto: CreatePeliculaDto): Promise<Pelicula> {
    const { generoIds, reparto, fechaEstreno, ...datos } = createPeliculaDto;

    try {
      const pelicula = await this.prisma.pelicula.create({
        data: {
          ...datos,
          fechaEstreno: this.convertirFecha(fechaEstreno),
          generos: {
            create: (generoIds ?? []).map((generoId) => ({ generoId })),
          },
          reparto: { create: this.armarReparto(reparto ?? []) },
        },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(pelicula);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async findAll(filtros: FiltrarPeliculasDto): Promise<Pelicula[]> {
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
    const { generoIds, reparto, fechaEstreno, ...datos } = updatePeliculaDto;

    await this.findOne(id);

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
          reparto: reparto
            ? { deleteMany: {}, create: this.armarReparto(reparto) }
            : undefined,
        },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(pelicula);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async subirPoster(id: number, archivo?: ArchivoSubido): Promise<Pelicula> {
    const pelicula = await this.findOne(id);
    const posterNuevo = await this.imagenes.guardar(
      'peliculas',
      pelicula.slug,
      archivo,
    );

    try {
      const actualizada = await this.prisma.pelicula.update({
        where: { id },
        data: { posterArchivo: posterNuevo },
        include: INCLUIR_RELACIONES,
      });

      await this.imagenes.eliminar('peliculas', pelicula.posterArchivo);

      return this.presentar(actualizada);
    } catch (error) {
      await this.imagenes.eliminar('peliculas', posterNuevo);
      throw error;
    }
  }

  async remove(id: number): Promise<Pelicula> {
    await this.findOne(id);

    try {
      const pelicula = await this.prisma.pelicula.delete({
        where: { id },
        include: INCLUIR_RELACIONES,
      });

      await this.imagenes.eliminar('peliculas', pelicula.posterArchivo);

      return this.presentar(pelicula);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar la película porque tiene funciones.',
        );
      }

      throw error;
    }
  }

  private armarReparto(reparto: CreatePeliculaDto['reparto'] = []) {
    return reparto.map((actor, indice) => ({
      orden: indice + 1,
      nombre: actor.nombre,
      fotoArchivo: actor.fotoArchivo ?? null,
    }));
  }

  private convertirFecha(fecha?: string | null) {
    if (!fecha) {
      return fecha;
    }

    return new Date(`${fecha}T00:00:00.000Z`);
  }

  private traducirError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Ya existe una película con ese slug.');
      }

      if (error.code === 'P2003') {
        return new BadRequestException(
          'La clasificación o alguno de los géneros no existe.',
        );
      }
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
      reparto: pelicula.reparto.map((actor) => this.presentarActor(actor)),
    };
  }

  private presentarActor(
    actor: PeliculaConRelaciones['reparto'][number],
  ): ActorPelicula {
    return {
      nombre: actor.nombre,
      fotoArchivo: actor.fotoArchivo,
      fotoUrl: actor.fotoArchivo
        ? urlDeImagen(this.urlBase, 'reparto', actor.fotoArchivo)
        : null,
    };
  }
}
