import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client.js';
import { UsuarioAutenticado } from '../auth/auth.types.js';
import { RegisterDto } from '../auth/dto/register.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Usuario } from './entities/usuario.entity.js';

const RONDAS_DE_BCRYPT = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async crearCliente(registerDto: RegisterDto): Promise<Usuario> {
    try {
      return await this.prisma.usuario.create({
        data: {
          nombre: registerDto.nombre.trim(),
          apellido: registerDto.apellido.trim(),
          correo: this.normalizarCorreo(registerDto.correo),
          contrasenaHash: await bcrypt.hash(
            registerDto.contrasena,
            RONDAS_DE_BCRYPT,
          ),
          rol: 'cliente',
        },
        omit: { contrasenaHash: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }

      throw error;
    }
  }

  buscarPorCorreo(correo: string) {
    return this.prisma.usuario.findUnique({
      where: { correo: this.normalizarCorreo(correo) },
    });
  }

  findAll(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany({
      omit: { contrasenaHash: true },
      orderBy: { id: 'asc' },
    });
  }

  findOne(id: number, solicitante: UsuarioAutenticado): Promise<Usuario> {
    this.exigirPropioOAdmin(id, solicitante);

    return this.buscar(id);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    solicitante: UsuarioAutenticado,
  ): Promise<Usuario> {
    this.exigirPropioOAdmin(id, solicitante);
    await this.buscar(id);

    const esAdmin = solicitante.rol === 'admin';

    if (updateUserDto.rol !== undefined && !esAdmin) {
      throw new ForbiddenException(
        'Solo un administrador puede cambiar el rol.',
      );
    }

    if (updateUserDto.contrasena !== undefined && !esAdmin) {
      await this.exigirContrasenaActual(id, updateUserDto.contrasenaActual);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nombre: updateUserDto.nombre?.trim(),
        apellido: updateUserDto.apellido?.trim(),
        rol: updateUserDto.rol,
        contrasenaHash: updateUserDto.contrasena
          ? await bcrypt.hash(updateUserDto.contrasena, RONDAS_DE_BCRYPT)
          : undefined,
      },
      omit: { contrasenaHash: true },
    });
  }

  async remove(id: number): Promise<Usuario> {
    await this.buscar(id);

    try {
      return await this.prisma.usuario.delete({
        where: { id },
        omit: { contrasenaHash: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar el usuario porque tiene órdenes.',
        );
      }

      throw error;
    }
  }

  async buscar(id: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      omit: { contrasenaHash: true },
    });

    if (!usuario) {
      throw new NotFoundException(`No existe un usuario con id ${id}.`);
    }

    return usuario;
  }

  private exigirPropioOAdmin(id: number, solicitante: UsuarioAutenticado) {
    if (solicitante.rol !== 'admin' && solicitante.id !== id) {
      throw new ForbiddenException(
        'No podés acceder a los datos de otro usuario.',
      );
    }
  }

  private async exigirContrasenaActual(id: number, contrasenaActual?: string) {
    if (!contrasenaActual) {
      throw new BadRequestException(
        'Para cambiar la contraseña hay que enviar contrasenaActual.',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    const coincide =
      usuario &&
      (await bcrypt.compare(contrasenaActual, usuario.contrasenaHash));

    if (!coincide) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }
  }

  private normalizarCorreo(correo: string): string {
    return correo.trim().toLowerCase();
  }
}
