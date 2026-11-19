import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol, SolicitudAutenticada } from '../auth.types.js';
import { CLAVE_DE_ROLES } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      CLAVE_DE_ROLES,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const usuario = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>().usuario;

    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tenés permiso para hacer esto.');
    }

    return true;
  }
}
