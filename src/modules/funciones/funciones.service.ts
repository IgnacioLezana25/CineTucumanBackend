import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import {
  fechaLocal,
  horarioLocal,
  inicioDelDia,
  inicioDelDiaSiguiente,
} from '../comunes/horario-local.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
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
          ...createFuncionDto,
          iniciaEn: new Date(createFuncionDto.iniciaEn),
        },
        include: INCLUIR_DATOS,
      });

      return this.presentar(funcion);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async findAll(filtros: FiltrarFuncionesDto): Promise<Funcion[]> {
    const funciones = await this.prisma.funcion.findMany({
      where: {
        peliculaId: filtros.peliculaId,
        salaId: filtros.salaId,
        sala: filtros.sucursalId
          ? { sucursalId: filtros.sucursalId }
          : undefined,
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

    const ocupadas = funcion.entradas.map((entrada) => entrada.butacaId);

    return {
      funcionId: funcion.id,
      salaId: funcion.salaId,
      sala: funcion.sala.nombre,
      capacidad: funcion.sala.butacas.length,
      vendidas: ocupadas.length,
      butacas: funcion.sala.butacas.map((butaca) => ({
        id: butaca.id,
        codigo: `${butaca.fila}${butaca.numero}`,
        fila: butaca.fila,
        numero: butaca.numero,
        accesible: butaca.accesible,
        ocupada: ocupadas.includes(butaca.id),
      })),
    };
  }

  async update(
    id: number,
    updateFuncionDto: UpdateFuncionDto,
  ): Promise<Funcion> {
    const actual = await this.findOne(id);
    const cambiaDeSala =
      updateFuncionDto.salaId !== undefined &&
      updateFuncionDto.salaId !== actual.salaId;

    if (cambiaDeSala && actual.vendidas > 0) {
      throw new ConflictException(
        'No se puede cambiar la sala de una función con entradas vendidas.',
      );
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
      throw this.traducirError(error);
    }
  }

  async remove(id: number): Promise<Funcion> {
    await this.findOne(id);

    try {
      const funcion = await this.prisma.funcion.delete({
        where: { id },
        include: INCLUIR_DATOS,
      });

      return this.presentar(funcion);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar la función porque tiene entradas vendidas.',
        );
      }

      throw error;
    }
  }

  private rangoDeInicio(filtros: FiltrarFuncionesDto) {
    const ahora = new Date();
    const soloProximas = filtros.proximas === 'true';

    if (filtros.fecha) {
      const desde = inicioDelDia(filtros.fecha);

      return {
        gte: soloProximas && desde < ahora ? ahora : desde,
        lt: inicioDelDiaSiguiente(filtros.fecha),
      };
    }

    if (soloProximas) {
      return { gte: ahora };
    }

    return undefined;
  }

  private traducirError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          'Ya hay una función en esa sala a esa hora.',
        );
      }

      if (error.code === 'P2003') {
        return new BadRequestException('La película o la sala no existe.');
      }
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
