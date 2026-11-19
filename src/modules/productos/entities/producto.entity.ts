export class Producto {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: number;
  activo: boolean;
}
