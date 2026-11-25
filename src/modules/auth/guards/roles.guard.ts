import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SolicitudAutenticada } from '../auth.types.js';
import { CLAVE_DE_ROLES } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.get<string[]>(
      CLAVE_DE_ROLES,
      contexto.getHandler(),
    );

    if (!rolesPermitidos) {
      return true;
    }

    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>();

    if (
      !solicitud.usuario ||
      !rolesPermitidos.includes(solicitud.usuario.rol)
    ) {
      throw new ForbiddenException('No tenés permiso para hacer esto.');
    }

    return true;
  }
}
