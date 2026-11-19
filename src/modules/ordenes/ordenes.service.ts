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
import {
  PRISMA_CLAVE_UNICA,
  PRISMA_NO_ENCONTRADO,
  codigoDeError,
} from '../prisma/prisma-error.util.js';
import { CreateOrdenDto } from './dto/create-orden.dto.js';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto.js';
import { Orden } from './entities/orden.entity.js';
import { generarNumeroDeOrden } from './numero-orden.util.js';

const INTENTOS_DE_NUMERO = 3;

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

    const preciosDeEntradas = await this.validarEntradas(entradas);
    const preciosDeProductos = await this.validarProductos(productos);

    for (let intento = 1; ; intento++) {
      try {
        const orden = await this.prisma.orden.create({
          data: {
            numero: generarNumeroDeOrden(),
            usuarioId: comprador.id,
            estado: 'pagada',
            entradas: {
              create: entradas.map((entrada) => ({
                funcionId: entrada.funcionId,
                butacaId: entrada.butacaId,
                precioUnitario: preciosDeEntradas.get(entrada.funcionId)!,
              })),
            },
            productos: {
              create: productos.map((producto) => ({
                productoId: producto.productoId,
                cantidad: producto.cantidad,
                precioUnitario: preciosDeProductos.get(producto.productoId)!,
              })),
            },
          },
          include: INCLUIR_DETALLE,
        });

        return this.presentar(orden);
      } catch (error) {
        if (codigoDeError(error) !== PRISMA_CLAVE_UNICA) {
          throw error;
        }

        if (!this.esConflictoDeNumero(error) || intento >= INTENTOS_DE_NUMERO) {
          throw new ConflictException(
            'Alguna de las butacas ya fue vendida. Elegí otras y volvé a intentar.',
          );
        }
      }
    }
  }

  async findAll(
    solicitante: UsuarioAutenticado,
    filtros: FiltrarOrdenesDto = {},
  ): Promise<Orden[]> {
    const esAdmin = solicitante.rol === 'admin';

    if (
      !esAdmin &&
      filtros.usuarioId !== undefined &&
      Number(filtros.usuarioId) !== solicitante.id
    ) {
      throw new ForbiddenException('Solo podés ver tus propias órdenes.');
    }

    const ordenes = await this.prisma.orden.findMany({
      where: {
        usuarioId: esAdmin
          ? filtros.usuarioId === undefined
            ? undefined
            : Number(filtros.usuarioId)
          : solicitante.id,
        estado: filtros.estado,
      },
      include: INCLUIR_DETALLE,
      orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }],
    });

    return ordenes.map((orden) => this.presentar(orden));
  }

  async findOne(id: number, solicitante: UsuarioAutenticado): Promise<Orden> {
    return this.presentar(await this.buscar(id, solicitante));
  }

  async cancelar(id: number, solicitante: UsuarioAutenticado): Promise<Orden> {
    const orden = await this.buscar(id, solicitante);

    if (orden.estado === 'cancelada') {
      throw new ConflictException('La orden ya está cancelada.');
    }

    const ahora = new Date();

    if (orden.entradas.some((entrada) => entrada.funcion.iniciaEn <= ahora)) {
      throw new ConflictException(
        'No se puede cancelar la orden porque una de sus funciones ya empezó.',
      );
    }

    try {
      const [, , cancelada] = await this.prisma.$transaction([
        this.prisma.entrada.deleteMany({ where: { ordenId: id } }),
        this.prisma.ordenProducto.deleteMany({ where: { ordenId: id } }),
        this.prisma.orden.update({
          where: { id },
          data: { estado: 'cancelada' },
          include: INCLUIR_DETALLE,
        }),
      ]);

      return this.presentar(cancelada);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_NO_ENCONTRADO) {
        throw new NotFoundException(`No existe una orden con id ${id}.`);
      }

      throw error;
    }
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

  private async validarEntradas(
    entradas: NonNullable<CreateOrdenDto['entradas']>,
  ): Promise<Map<number, Prisma.Decimal>> {
    const precios = new Map<number, Prisma.Decimal>();

    if (entradas.length === 0) {
      return precios;
    }

    const funcionIds = [...new Set(entradas.map((e) => e.funcionId))];
    const butacaIds = [...new Set(entradas.map((e) => e.butacaId))];
    const [funciones, butacas] = await Promise.all([
      this.prisma.funcion.findMany({ where: { id: { in: funcionIds } } }),
      this.prisma.butaca.findMany({ where: { id: { in: butacaIds } } }),
    ]);
    const funcionPorId = new Map(funciones.map((f) => [f.id, f]));
    const butacaPorId = new Map(butacas.map((b) => [b.id, b]));
    const ahora = new Date();

    for (const { funcionId, butacaId } of entradas) {
      const funcion = funcionPorId.get(funcionId);
      const butaca = butacaPorId.get(butacaId);

      if (!funcion) {
        throw new BadRequestException(`La función ${funcionId} no existe.`);
      }

      if (funcion.iniciaEn <= ahora) {
        throw new BadRequestException(`La función ${funcionId} ya empezó.`);
      }

      if (!butaca) {
        throw new BadRequestException(`La butaca ${butacaId} no existe.`);
      }

      if (butaca.salaId !== funcion.salaId) {
        throw new BadRequestException(
          `La butaca ${butacaId} no es de la sala de la función ${funcionId}.`,
        );
      }

      precios.set(funcionId, new Prisma.Decimal(funcion.precio));
    }

    return precios;
  }

  private async validarProductos(
    productos: NonNullable<CreateOrdenDto['productos']>,
  ): Promise<Map<number, Prisma.Decimal>> {
    const precios = new Map<number, Prisma.Decimal>();

    if (productos.length === 0) {
      return precios;
    }

    const encontrados = await this.prisma.producto.findMany({
      where: { id: { in: productos.map((p) => p.productoId) } },
    });
    const productoPorId = new Map(encontrados.map((p) => [p.id, p]));

    for (const { productoId } of productos) {
      const producto = productoPorId.get(productoId);

      if (!producto) {
        throw new BadRequestException(`El producto ${productoId} no existe.`);
      }

      if (!producto.activo) {
        throw new BadRequestException(
          `El producto ${productoId} ya no está disponible.`,
        );
      }

      precios.set(productoId, new Prisma.Decimal(producto.precio));
    }

    return precios;
  }

  private esConflictoDeNumero(error: unknown): boolean {
    const meta =
      typeof error === 'object' && error !== null && 'meta' in error
        ? JSON.stringify(error.meta)
        : '';

    return meta.includes('ordenes_numero_key');
  }

  private presentar(orden: OrdenConDetalle): Orden {
    const totalDeEntradas = orden.entradas.reduce(
      (suma, entrada) => suma.plus(entrada.precioUnitario),
      new Prisma.Decimal(0),
    );
    const totalDeProductos = orden.productos.reduce(
      (suma, producto) =>
        suma.plus(
          new Prisma.Decimal(producto.precioUnitario).times(producto.cantidad),
        ),
      new Prisma.Decimal(0),
    );

    return {
      id: orden.id,
      numero: orden.numero,
      usuarioId: orden.usuarioId,
      estado: orden.estado,
      creadaEn: orden.creadaEn.toISOString(),
      entradas: orden.entradas.map((entrada) => ({
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
      })),
      productos: orden.productos.map((producto) => ({
        productoId: producto.productoId,
        nombre: producto.producto.nombre,
        cantidad: producto.cantidad,
        precioUnitario: Number(producto.precioUnitario),
        subtotal: new Prisma.Decimal(producto.precioUnitario)
          .times(producto.cantidad)
          .toNumber(),
      })),
      total: totalDeEntradas.plus(totalDeProductos).toNumber(),
    };
  }
}
