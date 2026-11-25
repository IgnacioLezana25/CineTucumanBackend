import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

describe('Validación de los datos que llegan (e2e)', () => {
  let app: INestApplication<App>;
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
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    tokenAdmin = await app.get(JwtService).signAsync({
      sub: 5,
      correo: 'admin@test.com',
      rol: 'admin',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde 400 si el cuerpo trae un campo que el DTO no declara, y no toca la base', async () => {
    const producto = {
      slug: 'pochoclo-chico',
      nombre: 'Pochoclo chico',
      categoria: 'snack',
      precio: 3000,
    };

    const respuesta = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...producto, color: 'rojo' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ id: 999 })
      .expect(400);

    expect(respuesta.body.message).toContain('property color should not exist');
    expect(prisma.producto.create).not.toHaveBeenCalled();
    expect(prisma.pelicula.update).not.toHaveBeenCalled();
  });

  it('responde 400 si un filtro de la URL no existe', async () => {
    await request(app.getHttpServer()).get('/peliculas?color=rojo').expect(400);

    expect(prisma.pelicula.findMany).not.toHaveBeenCalled();
  });
});
