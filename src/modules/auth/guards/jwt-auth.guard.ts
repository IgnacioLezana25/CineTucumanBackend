import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PayloadJwt, SolicitudAutenticada } from '../auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>();
    const token = this.extraerToken(solicitud);

    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadJwt>(token);

      solicitud.usuario = {
        id: payload.sub,
        correo: payload.correo,
        rol: payload.rol,
      };
    } catch {
      throw new UnauthorizedException('El token no es válido o venció.');
    }

    return true;
  }

  private extraerToken(solicitud: SolicitudAutenticada): string | undefined {
    const [tipo, token] = solicitud.headers.authorization?.split(' ') ?? [];

    return tipo === 'Bearer' && token ? token : undefined;
  }
}
