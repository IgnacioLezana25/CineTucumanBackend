import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FiltrarSalasDto } from './dto/filtrar-salas.dto.js';

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  generos() {
    return this.prisma.genero.findMany({ orderBy: { nombre: 'asc' } });
  }

  clasificaciones() {
    return this.prisma.clasificacion.findMany({ orderBy: { id: 'asc' } });
  }

  ciudades() {
    return this.prisma.ciudad.findMany({ orderBy: { nombre: 'asc' } });
  }

  async salas(filtros: FiltrarSalasDto = {}) {
    const salas = await this.prisma.sala.findMany({
      where: {
        sucursalId:
          filtros.sucursalId === undefined
            ? undefined
            : Number(filtros.sucursalId),
      },
      include: {
        sucursal: { select: { nombre: true } },
        _count: { select: { butacas: true } },
      },
      orderBy: [{ sucursalId: 'asc' }, { nombre: 'asc' }],
    });

    return salas.map((sala) => ({
      id: sala.id,
      sucursalId: sala.sucursalId,
      sucursal: sala.sucursal.nombre,
      nombre: sala.nombre,
      capacidad: sala._count.butacas,
    }));
  }
}
