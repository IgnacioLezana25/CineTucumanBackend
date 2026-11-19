import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

describe('Catálogos (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    genero: { findMany: vi.fn() },
    clasificacion: { findMany: vi.fn() },
    ciudad: { findMany: vi.fn() },
    sala: { findMany: vi.fn() },
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
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /catalogos/generos, /clasificaciones y /ciudades devuelven las listas', async () => {
    prisma.genero.findMany.mockResolvedValue([{ id: 1, nombre: 'Acción' }]);
    prisma.clasificacion.findMany.mockResolvedValue([{ id: 1, nombre: 'ATP' }]);
    prisma.ciudad.findMany.mockResolvedValue([
      { id: 2, nombre: 'Yerba Buena', provincia: 'Tucumán' },
    ]);

    const generos = await request(app.getHttpServer())
      .get('/catalogos/generos')
      .expect(200);
    const clasificaciones = await request(app.getHttpServer())
      .get('/catalogos/clasificaciones')
      .expect(200);
    const ciudades = await request(app.getHttpServer())
      .get('/catalogos/ciudades')
      .expect(200);

    expect(generos.body).toEqual([{ id: 1, nombre: 'Acción' }]);
    expect(clasificaciones.body[0].nombre).toBe('ATP');
    expect(ciudades.body[0].provincia).toBe('Tucumán');
  });

  it('GET /catalogos/salas devuelve cada sala con su sucursal y su capacidad, y filtra por sucursalId', async () => {
    prisma.sala.findMany.mockResolvedValue([
      {
        id: 3,
        sucursalId: 2,
        nombre: 'Sala 1',
        sucursal: { nombre: 'Cine Atlas Vía 24' },
        _count: { butacas: 48 },
      },
    ]);

    const respuesta = await request(app.getHttpServer())
      .get('/catalogos/salas?sucursalId=2')
      .expect(200);

    expect(respuesta.body).toEqual([
      {
        id: 3,
        sucursalId: 2,
        sucursal: 'Cine Atlas Vía 24',
        nombre: 'Sala 1',
        capacidad: 48,
      },
    ]);
    expect(prisma.sala.findMany.mock.calls[0][0].where).toEqual({
      sucursalId: 2,
    });
  });

  it('GET /catalogos/salas con un sucursalId inválido responde 400', async () => {
    await request(app.getHttpServer())
      .get('/catalogos/salas?sucursalId=abc')
      .expect(400);
  });
});
