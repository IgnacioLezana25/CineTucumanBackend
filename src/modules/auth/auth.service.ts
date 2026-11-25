import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../users/entities/usuario.entity.js';
import { UsersService } from '../users/users.service.js';
import { PayloadJwt } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Sesion } from './entities/sesion.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Sesion> {
    const usuario = await this.usersService.crearCliente(registerDto);

    return this.crearSesion(usuario);
  }

  async login(loginDto: LoginDto): Promise<Sesion> {
    const usuario = await this.usersService.buscarPorCorreo(loginDto.correo);

    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const coincide = await bcrypt.compare(
      loginDto.contrasena,
      usuario.contrasenaHash,
    );

    if (!coincide) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    return this.crearSesion(await this.usersService.buscar(usuario.id));
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
