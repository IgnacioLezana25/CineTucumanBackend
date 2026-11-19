import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { SolicitudAutenticada, UsuarioAutenticado } from '../auth.types.js';

export const UsuarioActual = createParamDecorator(
  (
    _dato: unknown,
    contexto: ExecutionContext,
  ): UsuarioAutenticado | undefined =>
    contexto.switchToHttp().getRequest<SolicitudAutenticada>().usuario,
);
