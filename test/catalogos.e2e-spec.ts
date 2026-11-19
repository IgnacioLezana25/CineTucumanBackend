import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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
});
