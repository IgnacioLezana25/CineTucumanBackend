import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

const configuracionCon = (url: string | undefined) =>
  ({
    getOrThrow: (clave: string) => {
      if (url === undefined) throw new Error(`falta ${clave}`);

      return url;
    },
  }) as unknown as ConfigService;

describe('PrismaService', () => {
  it('se crea con una URL válida sin conectarse todavía', () => {
    expect(
      () =>
        new PrismaService(
          configuracionCon(
            'postgresql://postgres:clave@localhost:5432/cine_tucuman',
          ),
        ),
    ).not.toThrow();
  });

  it('avisa con un mensaje claro si DATABASE_URL no es una URL', () => {
    expect(
      () =>
        new PrismaService(
          configuracionCon('postgresql://postgres:a#b@localhost/db?'),
        ),
    ).toThrow(/DATABASE_URL no es una URL válida/);
  });

  it('falla si DATABASE_URL no está definida', () => {
    expect(() => new PrismaService(configuracionCon(undefined))).toThrow(
      /DATABASE_URL/,
    );
  });
});
