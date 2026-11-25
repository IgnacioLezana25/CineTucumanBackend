import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { UsuarioAutenticado } from '../auth/auth.types.js';
import { fechaLocal, horarioLocal } from '../comunes/horario-local.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrdenDto } from './dto/create-orden.dto.js';
import { EntradaOrdenDto } from './dto/entrada-orden.dto.js';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto.js';
import { ProductoOrdenDto } from './dto/producto-orden.dto.js';
import { Orden } from './entities/orden.entity.js';
import { generarNumeroDeOrden } from './numero-orden.util.js';

const INCLUIR_DETALLE = {
  entradas: {
    orderBy: { id: 'asc' },
    include: {
      butaca: true,
      funcion: {
        include: {
          pelicula: { select: { titulo: true } },
          sala: {
            select: { nombre: true, sucursal: { select: { nombre: true } } },
          },
        },
      },
    },
  },
  productos: {
    orderBy: { productoId: 'asc' },
    include: { producto: { select: { nombre: true } } },
  },
} satisfies Prisma.OrdenInclude;

type OrdenConDetalle = Prisma.OrdenGetPayload<{
  include: typeof INCLUIR_DETALLE;
}>;

interface EntradaAGuardar {
  funcionId: number;
  butacaId: number;
  precioUnitario: number;
}

interface ProductoAGuardar {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

@Injectable()
export class OrdenesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createOrdenDto: CreateOrdenDto,
    comprador: UsuarioAutenticado,
  ): Promise<Orden> {
    const entradas = createOrdenDto.entradas ?? [];
    const productos = createOrdenDto.productos ?? [];

    if (entradas.length === 0 && productos.length === 0) {
      throw new BadRequestException(
        'La orden tiene que incluir al menos una entrada o un producto.',
      );
    }

    const entradasAGuardar = await this.prepararEntradas(entradas);
    const productosAGuardar = await this.prepararProductos(productos);

    try {
      const orden = await this.prisma.orden.create({
        data: {
          numero: generarNumeroDeOrden(),
          usuarioId: comprador.id,
          estado: 'pagada',
          entradas: { create: entradasAGuardar },
          productos: { create: productosAGuardar },
        },
        include: INCLUIR_DETALLE,
      });

      return this.presentar(orden);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Alguna de las butacas ya fue vendida. Elegí otras y volvé a intentar.',
        );
      }

      throw error;
    }
  }

  async findAll(
    solicitante: UsuarioAutenticado,
    filtros: FiltrarOrdenesDto,
  ): Promise<Orden[]> {
    const esAdmin = solicitante.rol === 'admin';

    if (
      !esAdmin &&
      filtros.usuarioId !== undefined &&
      filtros.usuarioId !== solicitante.id
    ) {
      throw new ForbiddenException('Solo podés ver tus propias órdenes.');
    }

    const ordenes = await this.prisma.orden.findMany({
      where: {
        usuarioId: esAdmin ? filtros.usuarioId : solicitante.id,
        estado: filtros.estado,
      },
      include: INCLUIR_DETALLE,
      orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }],
    });

    return ordenes.map((orden) => this.presentar(orden));
  }

  async findOne(id: number, solicitante: UsuarioAutenticado): Promise<Orden> {
    const orden = await this.buscar(id, solicitante);

    return this.presentar(orden);
  }

  async cancelar(id: number, solicitante: UsuarioAutenticado): Promise<Orden> {
    const orden = await this.buscar(id, solicitante);

    if (orden.estado === 'cancelada') {
      throw new ConflictException('La orden ya está cancelada.');
    }

    const ahora = new Date();
    const yaEmpezoAlguna = orden.entradas.some(
      (entrada) => entrada.funcion.iniciaEn <= ahora,
    );

    if (yaEmpezoAlguna) {
      throw new ConflictException(
        'No se puede cancelar la orden porque una de sus funciones ya empezó.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.entrada.deleteMany({ where: { ordenId: id } }),
      this.prisma.ordenProducto.deleteMany({ where: { ordenId: id } }),
      this.prisma.orden.update({
        where: { id },
        data: { estado: 'cancelada' },
      }),
    ]);

    return this.findOne(id, solicitante);
  }

  private async buscar(
    id: number,
    solicitante: UsuarioAutenticado,
  ): Promise<OrdenConDetalle> {
    const orden = await this.prisma.orden.findUnique({
      where: { id },
      include: INCLUIR_DETALLE,
    });

    if (!orden) {
      throw new NotFoundException(`No existe una orden con id ${id}.`);
    }

    if (solicitante.rol !== 'admin' && orden.usuarioId !== solicitante.id) {
      throw new ForbiddenException(
        'No podés acceder a la orden de otra persona.',
      );
    }

    return orden;
  }

  private async prepararEntradas(
    entradas: EntradaOrdenDto[],
  ): Promise<EntradaAGuardar[]> {
    const resultado: EntradaAGuardar[] = [];

    for (const entrada of entradas) {
      const funcion = await this.prisma.funcion.findUnique({
        where: { id: entrada.funcionId },
      });

      if (!funcion) {
        throw new BadRequestException(
          `La función ${entrada.funcionId} no existe.`,
        );
      }

      if (funcion.iniciaEn <= new Date()) {
        throw new BadRequestException(
          `La función ${entrada.funcionId} ya empezó.`,
        );
      }

      const butaca = await this.prisma.butaca.findUnique({
        where: { id: entrada.butacaId },
      });

      if (!butaca) {
        throw new BadRequestException(
          `La butaca ${entrada.butacaId} no existe.`,
        );
      }

      if (butaca.salaId !== funcion.salaId) {
        throw new BadRequestException(
          `La butaca ${entrada.butacaId} no es de la sala de la función ${entrada.funcionId}.`,
        );
      }

      resultado.push({
        funcionId: entrada.funcionId,
        butacaId: entrada.butacaId,
        precioUnitario: Number(funcion.precio),
      });
    }

    return resultado;
  }

  private async prepararProductos(
    productos: ProductoOrdenDto[],
  ): Promise<ProductoAGuardar[]> {
    const resultado: ProductoAGuardar[] = [];

    for (const item of productos) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: item.productoId },
      });

      if (!producto) {
        throw new BadRequestException(
          `El producto ${item.productoId} no existe.`,
        );
      }

      if (!producto.activo) {
        throw new BadRequestException(
          `El producto ${item.productoId} ya no está disponible.`,
        );
      }

      resultado.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: Number(producto.precio),
      });
    }

    return resultado;
  }

  private presentar(orden: OrdenConDetalle): Orden {
    const entradas = orden.entradas.map((entrada) => ({
      id: entrada.id,
      funcionId: entrada.funcionId,
      pelicula: entrada.funcion.pelicula.titulo,
      sucursal: entrada.funcion.sala.sucursal.nombre,
      sala: entrada.funcion.sala.nombre,
      iniciaEn: entrada.funcion.iniciaEn.toISOString(),
      fecha: fechaLocal(entrada.funcion.iniciaEn),
      horario: horarioLocal(entrada.funcion.iniciaEn),
      butacaId: entrada.butacaId,
      butaca: `${entrada.butaca.fila}${entrada.butaca.numero}`,
      precioUnitario: Number(entrada.precioUnitario),
    }));
    const productos = orden.productos.map((item) => ({
      productoId: item.productoId,
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precioUnitario: Number(item.precioUnitario),
      subtotal: this.redondear(Number(item.precioUnitario) * item.cantidad),
    }));

    let total = 0;

    for (const entrada of entradas) {
      total += entrada.precioUnitario;
    }

    for (const producto of productos) {
      total += producto.subtotal;
    }

    return {
      id: orden.id,
      numero: orden.numero,
      usuarioId: orden.usuarioId,
      estado: orden.estado,
      creadaEn: orden.creadaEn.toISOString(),
      entradas,
      productos,
      total: this.redondear(total),
    };
  }

  private redondear(importe: number): number {
    return Math.round(importe * 100) / 100;
  }
}
