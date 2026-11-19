import { Request } from 'express';

export type Rol = 'cliente' | 'admin';

export interface PayloadJwt {
  sub: number;
  correo: string;
  rol: Rol;
}

export interface UsuarioAutenticado {
  id: number;
  correo: string;
  rol: Rol;
}

export type SolicitudAutenticada = Request & { usuario?: UsuarioAutenticado };
