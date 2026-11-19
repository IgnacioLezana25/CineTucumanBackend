export class EnlaceSucursal {
  tipo: string;
  url: string;
}

export class Sucursal {
  id: number;
  slug: string;
  nombre: string;
  ciudadId: number;
  ciudad: string;
  provincia: string;
  direccion: string;
  descripcion: string | null;
  referencia: string | null;
  imagenArchivo: string | null;
  imagenUrl: string | null;
  destacada: boolean;
  enlaces: EnlaceSucursal[];
}
