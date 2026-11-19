import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import {
  fechaLocal,
  horarioLocal,
  inicioDelDia,
  inicioDelDiaSiguiente,
} from '../comunes/horario-local.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PRISMA_CLAVE_FORANEA,
  PRISMA_CLAVE_UNICA,
  PRISMA_NO_ENCONTRADO,
  codigoDeError,
} from '../prisma/prisma-error.util.js';
import { CreateFuncionDto } from './dto/create-funcion.dto.js';
import { FiltrarFuncionesDto } from './dto/filtrar-funciones.dto.js';
import { UpdateFuncionDto } from './dto/update-funcion.dto.js';
import {
  ButacasDeFuncion,
  EstadoFuncion,
  Funcion,
} from './entities/funcion.entity.js';

const PROPORCION_POCOS_LUGARES = 0.8;

const INCLUIR_DATOS = {
  pelicula: { select: { titulo: true } },
  sala: {
    select: {
      nombre: true,
      sucursalId: true,
      sucursal: { select: { nombre: true } },
      _count: { select: { butacas: true } },
    },
  },
  _count: { select: { entradas: true } },
} satisfies Prisma.FuncionInclude;

type FuncionConDatos = Prisma.FuncionGetPayload<{
  include: typeof INCLUIR_DATOS;
}>;

@Injectable()
export class FuncionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFuncionDto: CreateFuncionDto): Promise<Funcion> {
    try {
      const funcion = await this.prisma.funcion.create({
        data: {
          peliculaId: createFuncionDto.peliculaId,
          salaId: createFuncionDto.salaId,
          iniciaEn: new Date(createFuncionDto.iniciaEn),
          formato: createFuncionDto.formato,
          idioma: createFuncionDto.idioma ?? undefined,
          precio: createFuncionDto.precio,
        },
        include: INCLUIR_DATOS,
      });

      return this.presentar(funcion);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async findAll(filtros: FiltrarFuncionesDto = {}): Promise<Funcion[]> {
    const funciones = await this.prisma.funcion.findMany({
      where: {
        peliculaId: this.aNumero(filtros.peliculaId),
        salaId: this.aNumero(filtros.salaId),
        sala:
          filtros.sucursalId === undefined
            ? undefined
            : { sucursalId: Number(filtros.sucursalId) },
        formato: filtros.formato,
        iniciaEn: this.rangoDeInicio(filtros),
      },
      include: INCLUIR_DATOS,
      orderBy: { iniciaEn: 'asc' },
    });

    return funciones.map((funcion) => this.presentar(funcion));
  }

  async findOne(id: number): Promise<Funcion> {
    const funcion = await this.prisma.funcion.findUnique({
      where: { id },
      include: INCLUIR_DATOS,
    });

    if (!funcion) {
      throw new NotFoundException(`No existe una función con id ${id}.`);
    }

    return this.presentar(funcion);
  }

  async findButacas(id: number): Promise<ButacasDeFuncion> {
    const funcion = await this.prisma.funcion.findUnique({
      where: { id },
      select: {
        id: true,
        salaId: true,
        sala: {
          select: {
            nombre: true,
            butacas: { orderBy: [{ fila: 'asc' }, { numero: 'asc' }] },
          },
        },
        entradas: { select: { butacaId: true } },
      },
    });

    if (!funcion) {
      throw new NotFoundException(`No existe una función con id ${id}.`);
    }

    const ocupadas = new Set(
      funcion.entradas.map((entrada) => entrada.butacaId),
    );

    return {
      funcionId: funcion.id,
      salaId: funcion.salaId,
      sala: funcion.sala.nombre,
      capacidad: funcion.sala.butacas.length,
      vendidas: ocupadas.size,
      butacas: funcion.sala.butacas.map((butaca) => ({
        id: butaca.id,
        codigo: `${butaca.fila}${butaca.numero}`,
        fila: butaca.fila,
        numero: butaca.numero,
        accesible: butaca.accesible,
        ocupada: ocupadas.has(butaca.id),
      })),
    };
  }

  async update(
    id: number,
    updateFuncionDto: UpdateFuncionDto,
  ): Promise<Funcion> {
    if (updateFuncionDto.salaId !== undefined) {
      await this.verificarCambioDeSala(id, updateFuncionDto.salaId);
    }

    try {
      const funcion = await this.prisma.funcion.update({
        where: { id },
        data: {
          peliculaId: updateFuncionDto.peliculaId ?? undefined,
          salaId: updateFuncionDto.salaId ?? undefined,
          iniciaEn: updateFuncionDto.iniciaEn
            ? new Date(updateFuncionDto.iniciaEn)
            : undefined,
          formato: updateFuncionDto.formato ?? undefined,
          idioma: updateFuncionDto.idioma ?? undefined,
          precio: updateFuncionDto.precio ?? undefined,
        },
        include: INCLUIR_DATOS,
      });

      return this.presentar(funcion);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una función con id ${id}.`);
      }

      throw this.traducirError(error);
    }
  }

  async remove(id: number): Promise<Funcion> {
    try {
      const funcion = await this.prisma.funcion.delete({
        where: { id },
        include: INCLUIR_DATOS,
      });

      return this.presentar(funcion);
    } catch (error) {
      const codigo = codigoDeError(error);

      if (codigo === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una función con id ${id}.`);
      }

      if (codigo === PRISMA_CLAVE_FORANEA) {
        throw new ConflictException(
          'No se puede eliminar la función porque tiene entradas vendidas.',
        );
      }

      throw error;
    }
  }

  private async verificarCambioDeSala(id: number, salaId: number) {
    const actual = await this.prisma.funcion.findUnique({
      where: { id },
      select: { salaId: true, _count: { select: { entradas: true } } },
    });

    if (!actual) {
      throw new NotFoundException(`No existe una función con id ${id}.`);
    }

    if (actual.salaId !== salaId && actual._count.entradas > 0) {
      throw new ConflictException(
        'No se puede cambiar la sala de una función con entradas vendidas.',
      );
    }
  }

  private aNumero(valor?: string): number | undefined {
    return valor === undefined ? undefined : Number(valor);
  }

  private rangoDeInicio(
    filtros: FiltrarFuncionesDto,
  ): Prisma.DateTimeFilter | undefined {
    const rango: Prisma.DateTimeFilter = {};

    if (filtros.fecha !== undefined) {
      rango.gte = inicioDelDia(filtros.fecha);
      rango.lt = inicioDelDiaSiguiente(filtros.fecha);
    }

    if (filtros.proximas === 'true') {
      const ahora = new Date();

      if (!(rango.gte instanceof Date) || rango.gte < ahora) {
        rango.gte = ahora;
      }
    }

    return Object.keys(rango).length > 0 ? rango : undefined;
  }

  private traducirError(error: unknown) {
    const codigo = codigoDeError(error);

    if (codigo === PRISMA_CLAVE_UNICA) {
      return new ConflictException(
        'Ya hay una función en esa sala a esa hora.',
      );
    }

    if (codigo === PRISMA_CLAVE_FORANEA) {
      return new BadRequestException('La película o la sala no existe.');
    }

    return error;
  }

  private calcularEstado(capacidad: number, vendidas: number): EstadoFuncion {
    if (vendidas >= capacidad) {
      return 'agotada';
    }

    if (vendidas >= capacidad * PROPORCION_POCOS_LUGARES) {
      return 'pocos-lugares';
    }

    return 'disponible';
  }

  private presentar(funcion: FuncionConDatos): Funcion {
    const capacidad = funcion.sala._count.butacas;
    const vendidas = funcion._count.entradas;

    return {
      id: funcion.id,
      peliculaId: funcion.peliculaId,
      pelicula: funcion.pelicula.titulo,
      salaId: funcion.salaId,
      sala: funcion.sala.nombre,
      sucursalId: funcion.sala.sucursalId,
      sucursal: funcion.sala.sucursal.nombre,
      iniciaEn: funcion.iniciaEn.toISOString(),
      fecha: fechaLocal(funcion.iniciaEn),
      horario: horarioLocal(funcion.iniciaEn),
      formato: funcion.formato,
      idioma: funcion.idioma,
      precio: Number(funcion.precio),
      capacidad,
      vendidas,
      estado: this.calcularEstado(capacidad, vendidas),
    };
  }
}
