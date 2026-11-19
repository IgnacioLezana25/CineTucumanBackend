import { Rol } from '../../auth/auth.types.js';

export class Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: Rol;
  creadoEn: Date;
}
