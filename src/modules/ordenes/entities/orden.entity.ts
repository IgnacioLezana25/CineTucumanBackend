export class EntradaDeOrden {
  id: number;
  funcionId: number;
  pelicula: string;
  sucursal: string;
  sala: string;
  iniciaEn: string;
  fecha: string;
  horario: string;
  butacaId: number;
  butaca: string;
  precioUnitario: number;
}

export class ProductoDeOrden {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export class Orden {
  id: number;
  numero: string;
  usuarioId: number;
  estado: string;
  creadaEn: string;
  entradas: EntradaDeOrden[];
  productos: ProductoDeOrden[];
  total: number;
}
