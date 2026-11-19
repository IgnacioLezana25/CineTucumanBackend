import { Usuario } from '../../users/entities/usuario.entity.js';

export class Sesion {
  access_token: string;
  usuario: Usuario;
}
