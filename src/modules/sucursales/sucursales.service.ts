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
import { CreateSucursalDto } from './dto/create-sucursal.dto.js';
import { FiltrarSucursalesDto } from './dto/filtrar-sucursales.dto.js';
import { UpdateSucursalDto } from './dto/update-sucursal.dto.js';
import { Sucursal } from './entities/sucursal.entity.js';

const INCLUIR_RELACIONES = {
  ciudad: true,
  enlaces: { orderBy: { tipo: 'asc' } },
} satisfies Prisma.SucursalInclude;

type SucursalConRelaciones = Prisma.SucursalGetPayload<{
  include: typeof INCLUIR_RELACIONES;
}>;

@Injectable()
export class SucursalesService {
  private readonly urlBase: string;

  constructor(
    private readonly prisma: PrismaService,
    configuracion: ConfigService,
  ) {
    this.urlBase = urlBaseDeLaApi(configuracion);
  }

  async create(createSucursalDto: CreateSucursalDto): Promise<Sucursal> {
    const { enlaces, ...datos } = createSucursalDto;

    try {
      const sucursal = await this.prisma.sucursal.create({
        data: {
          ...datos,
          descripcion: datos.descripcion ?? null,
          imagenArchivo: datos.imagenArchivo ?? null,
          enlaces: { create: enlaces ?? [] },
        },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(sucursal);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async findAll(filtros: FiltrarSucursalesDto = {}): Promise<Sucursal[]> {
    const sucursales = await this.prisma.sucursal.findMany({
      where: {
        destacada:
          filtros.destacada === undefined
            ? undefined
            : filtros.destacada === 'true',
      },
      include: INCLUIR_RELACIONES,
      orderBy: { id: 'asc' },
    });

    return sucursales.map((sucursal) => this.presentar(sucursal));
  }

  async findOne(id: number): Promise<Sucursal> {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: INCLUIR_RELACIONES,
    });

    if (!sucursal) {
      throw new NotFoundException(`No existe una sucursal con id ${id}.`);
    }

    return this.presentar(sucursal);
  }

  async findBySlug(slug: string): Promise<Sucursal> {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { slug },
      include: INCLUIR_RELACIONES,
    });

    if (!sucursal) {
      throw new NotFoundException(`No existe una sucursal con slug ${slug}.`);
    }

    return this.presentar(sucursal);
  }

  async update(
    id: number,
    updateSucursalDto: UpdateSucursalDto,
  ): Promise<Sucursal> {
    const { enlaces, ...datos } = updateSucursalDto;

    try {
      const sucursal = await this.prisma.sucursal.update({
        where: { id },
        data: {
          ...datos,
          slug: datos.slug ?? undefined,
          nombre: datos.nombre ?? undefined,
          ciudadId: datos.ciudadId ?? undefined,
          direccion: datos.direccion ?? undefined,
          destacada: datos.destacada ?? undefined,
          enlaces: enlaces ? { deleteMany: {}, create: enlaces } : undefined,
        },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(sucursal);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una sucursal con id ${id}.`);
      }

      throw this.traducirError(error);
    }
  }

  async remove(id: number): Promise<Sucursal> {
    try {
      const sucursal = await this.prisma.sucursal.delete({
        where: { id },
        include: INCLUIR_RELACIONES,
      });

      return this.presentar(sucursal);
    } catch (error) {
      const codigo = codigoDeError(error);

      if (codigo === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una sucursal con id ${id}.`);
      }

      if (codigo === PRISMA_CLAVE_FORANEA) {
        throw new ConflictException(
          'No se puede eliminar la sucursal porque sus salas tienen funciones.',
        );
      }

      throw error;
    }
  }

  private traducirError(error: unknown) {
    const codigo = codigoDeError(error);

    if (codigo === PRISMA_CLAVE_UNICA) {
      return new ConflictException('Ya existe una sucursal con ese slug.');
    }

    if (codigo === PRISMA_CLAVE_FORANEA) {
      return new BadRequestException('La ciudad no existe.');
    }

    return error;
  }

  private presentar(sucursal: SucursalConRelaciones): Sucursal {
    return {
      id: sucursal.id,
      slug: sucursal.slug,
      nombre: sucursal.nombre,
      ciudadId: sucursal.ciudadId,
      ciudad: sucursal.ciudad.nombre,
      provincia: sucursal.ciudad.provincia,
      direccion: sucursal.direccion,
      descripcion: sucursal.descripcion,
      imagenArchivo: sucursal.imagenArchivo,
      imagenUrl: sucursal.imagenArchivo
        ? urlDeImagen(this.urlBase, 'sucursales', sucursal.imagenArchivo)
        : null,
      destacada: sucursal.destacada,
      enlaces: sucursal.enlaces.map(({ tipo, url }) => ({ tipo, url })),
    };
  }
}
