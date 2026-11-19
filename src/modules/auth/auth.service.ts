import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { contrasenaCoincide } from '../users/contrasena.util.js';
import { Usuario } from '../users/entities/usuario.entity.js';
import { UsersService } from '../users/users.service.js';
import { PayloadJwt, Rol } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Sesion } from './entities/sesion.entity.js';

const HASH_FICTICIO =
  '$2b$10$eZwWvBF8iGeBj7Tisaldh.VdYYzrewM7io2BFj0zqAqLzqS0lHDve';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(datos: RegisterDto): Promise<Sesion> {
    const usuario = await this.usersService.crearCliente(datos);

    return this.crearSesion(usuario);
  }

  async login({ correo, contrasena }: LoginDto): Promise<Sesion> {
    const usuario =
      await this.usersService.buscarConContrasenaPorCorreo(correo);
    const coincide = await contrasenaCoincide(
      contrasena,
      usuario?.contrasenaHash ?? HASH_FICTICIO,
    );

    if (!usuario || !coincide) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    return this.crearSesion({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol as Rol,
      creadoEn: usuario.creadoEn,
    });
  }

  perfil(id: number): Promise<Usuario> {
    return this.usersService.buscar(id);
  }

  private async crearSesion(usuario: Usuario): Promise<Sesion> {
    const payload: PayloadJwt = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario,
    };
  }
}
