import { ConfigService } from '@nestjs/config';
import { opcionesDeJwt } from './jwt-config.util.js';

const SECRETO = 'un-secreto-de-prueba-con-mas-de-32-caracteres';

describe('opcionesDeJwt', () => {
  it('usa el secreto y una hora de duración por defecto', () => {
    const opciones = opcionesDeJwt(new ConfigService({ JWT_SECRET: SECRETO }));

    expect(opciones.secret).toBe(SECRETO);
    expect(opciones.signOptions?.expiresIn).toBe('1h');
  });

  it('toma la duración de JWT_EXPIRES_IN, en texto o en segundos', () => {
    const conTexto = opcionesDeJwt(
      new ConfigService({ JWT_SECRET: SECRETO, JWT_EXPIRES_IN: '8h' }),
    );
    const conSegundos = opcionesDeJwt(
      new ConfigService({ JWT_SECRET: SECRETO, JWT_EXPIRES_IN: '600' }),
    );

    expect(conTexto.signOptions?.expiresIn).toBe('8h');
    expect(conSegundos.signOptions?.expiresIn).toBe(600);
  });

  it('falla si JWT_SECRET no está definida', () => {
    expect(() => opcionesDeJwt(new ConfigService({}))).toThrow(/JWT_SECRET/);
  });

  it('falla si JWT_SECRET tiene menos de 32 caracteres', () => {
    expect(() =>
      opcionesDeJwt(new ConfigService({ JWT_SECRET: 'corta' })),
    ).toThrow(/al menos 32 caracteres/);
  });
});
