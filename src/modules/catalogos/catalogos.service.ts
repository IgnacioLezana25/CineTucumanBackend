import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
}
