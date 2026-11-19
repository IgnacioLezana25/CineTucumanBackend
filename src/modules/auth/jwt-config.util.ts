import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

const LARGO_MINIMO_DEL_SECRETO = 32;
const DURACION_POR_DEFECTO = '1h';

export function opcionesDeJwt(configuracion: ConfigService): JwtModuleOptions {
  const secreto = configuracion.getOrThrow<string>('JWT_SECRET');

  if (secreto.length < LARGO_MINIMO_DEL_SECRETO) {
    throw new Error(
      `JWT_SECRET es demasiado corta: tiene que tener al menos ${LARGO_MINIMO_DEL_SECRETO} caracteres.`,
    );
  }

  const duracion =
    configuracion.get<string>('JWT_EXPIRES_IN') ?? DURACION_POR_DEFECTO;

  return {
    secret: secreto,
    signOptions: {
      expiresIn: /^\d+$/.test(duracion)
        ? Number(duracion)
        : (duracion as `${number}${'s' | 'm' | 'h' | 'd'}`),
    },
  };
}
