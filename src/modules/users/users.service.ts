import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { Rol, UsuarioAutenticado } from '../auth/auth.types.js';
import { RegisterDto } from '../auth/dto/register.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PRISMA_CLAVE_FORANEA,
  PRISMA_CLAVE_UNICA,
  PRISMA_NO_ENCONTRADO,
  codigoDeError,
} from '../prisma/prisma-error.util.js';
import {
  cifrarContrasena,
  contrasenaCoincide,
  normalizarCorreo,
} from './contrasena.util.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Usuario } from './entities/usuario.entity.js';

const SELECCION_PUBLICA = {
  id: true,
  nombre: true,
  apellido: true,
  correo: true,
  rol: true,
  creadoEn: true,
} satisfies Prisma.UsuarioSelect;

type UsuarioEnBase = Prisma.UsuarioGetPayload<{
  select: typeof SELECCION_PUBLICA;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async crearCliente(datos: RegisterDto): Promise<Usuario> {
    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          correo: normalizarCorreo(datos.correo),
          contrasenaHash: await cifrarContrasena(datos.contrasena),
          rol: 'cliente',
        },
        select: SELECCION_PUBLICA,
      });

      return this.presentar(usuario);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_CLAVE_UNICA) {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }

      throw error;
    }
  }

  buscarConContrasenaPorCorreo(correo: string) {
    return this.prisma.usuario.findUnique({
      where: { correo: normalizarCorreo(correo) },
    });
  }

  async findAll(): Promise<Usuario[]> {
    const usuarios = await this.prisma.usuario.findMany({
      select: SELECCION_PUBLICA,
      orderBy: { id: 'asc' },
    });

    return usuarios.map((usuario) => this.presentar(usuario));
  }

  async findOne(id: number, solicitante: UsuarioAutenticado): Promise<Usuario> {
    this.exigirPropioOAdmin(id, solicitante);

    return this.buscar(id);
  }

  async update(
    id: number,
    cambios: UpdateUserDto,
    solicitante: UsuarioAutenticado,
  ): Promise<Usuario> {
    this.exigirPropioOAdmin(id, solicitante);

    const esAdmin = solicitante.rol === 'admin';

    if (cambios.rol !== undefined && !esAdmin) {
      throw new ForbiddenException(
        'Solo un administrador puede cambiar el rol.',
      );
    }

    if (cambios.contrasena !== undefined && !esAdmin) {
      await this.exigirContrasenaActual(id, cambios.contrasenaActual);
    }

    try {
      const usuario = await this.prisma.usuario.update({
        where: { id },
        data: {
          nombre: cambios.nombre?.trim(),
          apellido: cambios.apellido?.trim(),
          rol: cambios.rol,
          contrasenaHash: cambios.contrasena
            ? await cifrarContrasena(cambios.contrasena)
            : undefined,
        },
        select: SELECCION_PUBLICA,
      });

      return this.presentar(usuario);
    } catch (error) {
      throw this.traducirError(error, id);
    }
  }

  async remove(id: number): Promise<Usuario> {
    try {
      const usuario = await this.prisma.usuario.delete({
        where: { id },
        select: SELECCION_PUBLICA,
      });

      return this.presentar(usuario);
    } catch (error) {
      if (codigoDeError(error) === PRISMA_CLAVE_FORANEA) {
        throw new ConflictException(
          'No se puede eliminar el usuario porque tiene órdenes.',
        );
      }

      throw this.traducirError(error, id);
    }
  }

  async buscar(id: number): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: SELECCION_PUBLICA,
    });

    if (!usuario) {
      throw new NotFoundException(`No existe un usuario con id ${id}.`);
    }

    return this.presentar(usuario);
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

    if (
      !usuario ||
      !(await contrasenaCoincide(contrasenaActual, usuario.contrasenaHash))
    ) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }
  }

  private traducirError(error: unknown, id: number) {
    if (codigoDeError(error) === PRISMA_NO_ENCONTRADO) {
      return new NotFoundException(`No existe un usuario con id ${id}.`);
    }

    return error;
  }

  private presentar(usuario: UsuarioEnBase): Usuario {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol as Rol,
      creadoEn: usuario.creadoEn,
    };
  }
}
