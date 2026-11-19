export type EstadoFuncion = 'disponible' | 'pocos-lugares' | 'agotada';

export class Funcion {
  id: number;
  peliculaId: number;
  pelicula: string;
  salaId: number;
  sala: string;
  sucursalId: number;
  sucursal: string;
  iniciaEn: string;
  fecha: string;
  horario: string;
  formato: string;
  idioma: string;
  precio: number;
  capacidad: number;
  vendidas: number;
  estado: EstadoFuncion;
}

export class ButacaDeFuncion {
  id: number;
  codigo: string;
  fila: string;
  numero: number;
  accesible: boolean;
  ocupada: boolean;
}

export class ButacasDeFuncion {
  funcionId: number;
  salaId: number;
  sala: string;
  capacidad: number;
  vendidas: number;
  butacas: ButacaDeFuncion[];
}
