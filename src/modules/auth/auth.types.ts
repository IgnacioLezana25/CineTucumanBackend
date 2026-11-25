import { Request } from 'express';

export interface PayloadJwt {
  sub: number;
  correo: string;
  rol: string;
}

export interface UsuarioAutenticado {
  id: number;
  correo: string;
  rol: string;
}

export type SolicitudAutenticada = Request & { usuario?: UsuarioAutenticado };
