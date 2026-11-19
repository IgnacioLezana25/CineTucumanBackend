export class Pelicula {
  id: number;
  slug: string;
  titulo: string;
  tituloOriginal: string | null;
  sinopsis: string | null;
  duracionMinutos: number | null;
  clasificacionId: number | null;
  clasificacion: string | null;
  estado: string;
  destacada: boolean;
  fechaEstreno: string | null;
  posterArchivo: string;
  posterUrl: string;
  trailerYoutube: string | null;
  director: string | null;
  paisOrigen: string | null;
  generoIds: number[];
  generos: string[];
}
