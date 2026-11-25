import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

const rutasDeEscritura = [
  ['post', '/peliculas'],
  ['patch', '/peliculas/1'],
  ['delete', '/peliculas/1'],
  ['post', '/peliculas/1/poster'],
  ['post', '/funciones'],
  ['patch', '/funciones/1'],
  ['delete', '/funciones/1'],
  ['post', '/sucursales'],
  ['patch', '/sucursales/1'],
  ['delete', '/sucursales/1'],
  ['post', '/sucursales/1/imagen'],
  ['post', '/productos'],
  ['patch', '/productos/1'],
  ['delete', '/productos/1'],
] as const;

const rutasDeLectura = [
  '/peliculas',
  '/funciones',
  '/sucursales',
  '/productos',
] as const;

describe('Rutas de escritura de administrador (e2e)', () => {
  let app: INestApplication<App>;
  let tokenCliente: string;
  let tokenAdmin: string;
  const modelo = () => ({
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  const prisma = {
    pelicula: modelo(),
    funcion: modelo(),
    sucursal: modelo(),
    producto: modelo(),
  };

  const llamadas = () =>
    Object.values(prisma).flatMap((modeloDePrisma) =>
      Object.values(modeloDePrisma).flatMap((funcion) => funcion.mock.calls),
    );

  beforeEach(async () => {
    vi.resetAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const jwt = app.get(JwtService);
    tokenCliente = await jwt.signAsync({
      sub: 7,
      correo: 'ana@test.com',
      rol: 'cliente',
    });
    tokenAdmin = await jwt.signAsync({
      sub: 5,
      correo: 'admin@test.com',
      rol: 'admin',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(rutasDeEscritura)(
    '%s %s sin token responde 401 y no toca la base',
    async (metodo, ruta) => {
      await request(app.getHttpServer())[metodo](ruta).send({}).expect(401);

      expect(llamadas()).toHaveLength(0);
    },
  );

  it.each(rutasDeEscritura)(
    '%s %s con un token inválido responde 401 y no toca la base',
    async (metodo, ruta) => {
      await request(app.getHttpServer())
        [metodo](ruta)
        .set('Authorization', 'Bearer abc.def.ghi')
        .send({})
        .expect(401);

      expect(llamadas()).toHaveLength(0);
    },
  );

  it.each(rutasDeEscritura)(
    '%s %s con el token de un cliente responde 403 y no toca la base',
    async (metodo, ruta) => {
      await request(app.getHttpServer())
        [metodo](ruta)
        .set('Authorization', `Bearer ${tokenCliente}`)
        .send({})
        .expect(403);

      expect(llamadas()).toHaveLength(0);
    },
  );

  it.each(rutasDeEscritura)(
    '%s %s con el token de un administrador pasa los permisos y llega a la validación',
    async (metodo, ruta) => {
      await request(app.getHttpServer())
        [metodo](ruta.replace('/1', '/abc'))
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400);

      expect(llamadas()).toHaveLength(0);
    },
  );

  it.each(rutasDeLectura)('GET %s sigue abierto sin token', async (ruta) => {
    prisma.pelicula.findMany.mockResolvedValue([]);
    prisma.funcion.findMany.mockResolvedValue([]);
    prisma.sucursal.findMany.mockResolvedValue([]);
    prisma.producto.findMany.mockResolvedValue([]);

    await request(app.getHttpServer()).get(ruta).expect(200);
  });
});
