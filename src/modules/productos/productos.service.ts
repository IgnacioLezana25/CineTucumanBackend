import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PRISMA_CLAVE_FORANEA,
  PRISMA_CLAVE_UNICA,
  PRISMA_NO_ENCONTRADO,
  codigoDeError,
} from '../prisma/prisma-error.util.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { FiltrarProductosDto } from './dto/filtrar-productos.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { Producto } from './entities/producto.entity.js';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto): Promise<Producto> {
    try {
      const producto = await this.prisma.producto.create({
        data: {
          ...createProductoDto,
          descripcion: createProductoDto.descripcion ?? null,
        },
      });

      return this.presentar(producto);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  async findAll(filtros: FiltrarProductosDto = {}): Promise<Producto[]> {
    const productos = await this.prisma.producto.findMany({
      where: {
        categoria: filtros.categoria,
        activo:
          filtros.activo === undefined ? undefined : filtros.activo === 'true',
      },
      orderBy: { id: 'asc' },
    });

    return productos.map((producto) => this.presentar(producto));
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.prisma.producto.findUnique({ where: { id } });

    if (!producto) {
      throw new NotFoundException(`No existe un producto con id ${id}.`);
    }

    return this.presentar(producto);
  }

  async findBySlug(slug: string): Promise<Producto> {
    const producto = await this.prisma.producto.findUnique({ where: { slug } });

    if (!producto) {
      throw new NotFoundException(`No existe un producto con slug ${slug}.`);
    }

    return this.presentar(producto);
  }

  async update(
    id: number,
    updateProductoDto: UpdateProductoDto,
  ): Promise<Producto> {
    try {
      const producto = await this.prisma.producto.update({
        where: { id },
        data: {
          ...updateProductoDto,
          slug: updateProductoDto.slug ?? undefined,
          nombre: updateProductoDto.nombre ?? undefined,
          categoria: updateProductoDto.categoria ?? undefined,
          precio: updateProductoDto.precio ?? undefined,
          activo: updateProductoDto.activo ?? undefined,
        },
      });

      return this.presentar(producto);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe un producto con id ${id}.`);
      }

      throw this.traducirError(error);
    }
  }

  async remove(id: number): Promise<Producto> {
    try {
      const producto = await this.prisma.producto.delete({ where: { id } });

      return this.presentar(producto);
    } catch (error) {
      const codigo = codigoDeError(error);

      if (codigo === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe un producto con id ${id}.`);
      }

      if (codigo === PRISMA_CLAVE_FORANEA) {
        throw new ConflictException(
          'No se puede eliminar el producto porque figura en órdenes. Se puede desactivar con activo en false.',
        );
      }

      throw error;
    }
  }

  private traducirError(error: unknown) {
    if (codigoDeError(error) === PRISMA_CLAVE_UNICA) {
      return new ConflictException('Ya existe un producto con ese slug.');
    }

    return error;
  }

  private presentar(
    producto: Prisma.ProductoGetPayload<Record<string, never>>,
  ): Producto {
    return {
      id: producto.id,
      slug: producto.slug,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      precio: Number(producto.precio),
      activo: producto.activo,
    };
  }
}
