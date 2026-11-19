import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

const funcionEnBase = {
  id: 6,
  peliculaId: 3,
  salaId: 9,
  iniciaEn: new Date('2026-11-20T22:20:00.000Z'),
  formato: '2D',
  idioma: 'Castellano',
  precio: '8500',
  pelicula: { titulo: 'Spider-Man: Un nuevo día' },
  sala: {
    nombre: 'Sala 1',
    sucursalId: 5,
    sucursal: { nombre: 'Sunstar Cinemas' },
    _count: { butacas: 48 },
  },
  _count: { entradas: 2 },
};

const cuerpoValido = {
  peliculaId: 3,
  salaId: 9,
  iniciaEn: '2026-11-20T19:20:00-03:00',
  formato: '2D',
  precio: 8500,
};

describe('Funciones (e2e)', () => {
  let app: INestApplication<App>;
  const funcion = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ funcion })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /funciones devuelve la fecha y el horario locales, el precio como número y los datos de la sala', async () => {
    funcion.findMany.mockResolvedValue([funcionEnBase]);

    const respuesta = await request(app.getHttpServer())
      .get('/funciones')
      .expect(200);

    expect(respuesta.body[0]).toEqual({
      id: 6,
      peliculaId: 3,
      pelicula: 'Spider-Man: Un nuevo día',
      salaId: 9,
      sala: 'Sala 1',
      sucursalId: 5,
      sucursal: 'Sunstar Cinemas',
      iniciaEn: '2026-11-20T22:20:00.000Z',
      fecha: '2026-11-20',
      horario: '19:20',
      formato: '2D',
      idioma: 'Castellano',
      precio: 8500,
      capacidad: 48,
      vendidas: 2,
      estado: 'disponible',
    });
  });

  it('GET /funciones usa la fecha local: una función a las 21:30 locales sigue en el mismo día', async () => {
    funcion.findMany.mockResolvedValue([
      { ...funcionEnBase, iniciaEn: new Date('2026-11-21T00:30:00.000Z') },
    ]);

    const respuesta = await request(app.getHttpServer())
      .get('/funciones')
      .expect(200);

    expect(respuesta.body[0].fecha).toBe('2026-11-20');
    expect(respuesta.body[0].horario).toBe('21:30');
  });

  it('GET /funciones calcula el estado según las butacas vendidas', async () => {
    funcion.findMany.mockResolvedValue([
      { ...funcionEnBase, id: 1, _count: { entradas: 38 } },
      { ...funcionEnBase, id: 2, _count: { entradas: 39 } },
      { ...funcionEnBase, id: 3, _count: { entradas: 48 } },
    ]);

    const respuesta = await request(app.getHttpServer())
      .get('/funciones')
      .expect(200);

    expect(
      respuesta.body.map((item: { estado: string }) => item.estado),
    ).toEqual(['disponible', 'pocos-lugares', 'agotada']);
  });

  it('GET /funciones aplica los filtros de película, sucursal, formato y fecha', async () => {
    funcion.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/funciones?peliculaId=3&sucursalId=5&formato=3D&fecha=2026-11-20')
      .expect(200);

    const consulta = funcion.findMany.mock.calls[0][0];

    expect(consulta.where.peliculaId).toBe(3);
    expect(consulta.where.sala).toEqual({ sucursalId: 5 });
    expect(consulta.where.formato).toBe('3D');
    expect(consulta.where.iniciaEn.gte).toEqual(
      new Date('2026-11-20T03:00:00.000Z'),
    );
    expect(consulta.where.iniciaEn.lt).toEqual(
      new Date('2026-11-21T03:00:00.000Z'),
    );
    expect(consulta.orderBy).toEqual({ iniciaEn: 'asc' });
  });

  it('GET /funciones?proximas=true solo trae las que todavía no empezaron', async () => {
    funcion.findMany.mockResolvedValue([]);
    const antes = Date.now();

    await request(app.getHttpServer())
      .get('/funciones?proximas=true')
      .expect(200);

    const desde = funcion.findMany.mock.calls[0][0].where.iniciaEn.gte;

    expect(desde.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('GET /funciones con filtros inválidos responde 400', async () => {
    await request(app.getHttpServer())
      .get('/funciones?peliculaId=abc')
      .expect(400);
    await request(app.getHttpServer())
      .get('/funciones?fecha=2026-02-30')
      .expect(400);
    await request(app.getHttpServer()).get('/funciones?formato=4D').expect(400);
    await request(app.getHttpServer())
      .get('/funciones?proximas=quizas')
      .expect(400);
  });

  it('GET /funciones/:id devuelve la función y responde 404 si no existe', async () => {
    funcion.findUnique.mockResolvedValueOnce(funcionEnBase);
    funcion.findUnique.mockResolvedValueOnce(null);

    const respuesta = await request(app.getHttpServer())
      .get('/funciones/6')
      .expect(200);

    expect(respuesta.body.id).toBe(6);
    await request(app.getHttpServer()).get('/funciones/99').expect(404);
    await request(app.getHttpServer()).get('/funciones/abc').expect(400);
  });

  it('GET /funciones/:id/butacas marca las ocupadas y las accesibles', async () => {
    funcion.findUnique.mockResolvedValue({
      id: 6,
      salaId: 9,
      sala: {
        nombre: 'Sala 1',
        butacas: [
          { id: 1, fila: 'A', numero: 1, accesible: true },
          { id: 2, fila: 'A', numero: 2, accesible: false },
          { id: 3, fila: 'B', numero: 3, accesible: false },
        ],
      },
      entradas: [{ butacaId: 3 }],
    });

    const respuesta = await request(app.getHttpServer())
      .get('/funciones/6/butacas')
      .expect(200);

    expect(respuesta.body).toEqual({
      funcionId: 6,
      salaId: 9,
      sala: 'Sala 1',
      capacidad: 3,
      vendidas: 1,
      butacas: [
        {
          id: 1,
          codigo: 'A1',
          fila: 'A',
          numero: 1,
          accesible: true,
          ocupada: false,
        },
        {
          id: 2,
          codigo: 'A2',
          fila: 'A',
          numero: 2,
          accesible: false,
          ocupada: false,
        },
        {
          id: 3,
          codigo: 'B3',
          fila: 'B',
          numero: 3,
          accesible: false,
          ocupada: true,
        },
      ],
    });
  });

  it('GET /funciones/:id/butacas responde 404 si la función no existe', async () => {
    funcion.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer()).get('/funciones/99/butacas').expect(404);
  });

  it('POST /funciones crea la función y responde 201', async () => {
    funcion.create.mockResolvedValue(funcionEnBase);

    const respuesta = await request(app.getHttpServer())
      .post('/funciones')
      .send(cuerpoValido)
      .expect(201);

    expect(respuesta.body.id).toBe(6);
    expect(funcion.create.mock.calls[0][0].data.iniciaEn).toEqual(
      new Date('2026-11-20T22:20:00.000Z'),
    );
  });

  it('POST /funciones con datos inválidos responde 400', async () => {
    await request(app.getHttpServer())
      .post('/funciones')
      .send({ ...cuerpoValido, iniciaEn: '2026-11-20T19:20:00' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/funciones')
      .send({ ...cuerpoValido, formato: '4D' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/funciones')
      .send({ ...cuerpoValido, precio: -1 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/funciones')
      .send({ salaId: 9 })
      .expect(400);
    expect(funcion.create).not.toHaveBeenCalled();
  });

  it('POST /funciones traduce los errores de la base: 409 si la sala ya tiene una función a esa hora y 400 si la película o la sala no existen', async () => {
    funcion.create.mockRejectedValueOnce({ code: 'P2002' });
    funcion.create.mockRejectedValueOnce({ code: 'P2003' });

    await request(app.getHttpServer())
      .post('/funciones')
      .send(cuerpoValido)
      .expect(409);
    await request(app.getHttpServer())
      .post('/funciones')
      .send(cuerpoValido)
      .expect(400);
  });

  it('PATCH /funciones/:id modifica solo lo enviado', async () => {
    funcion.update.mockResolvedValue({ ...funcionEnBase, precio: '9000' });

    const respuesta = await request(app.getHttpServer())
      .patch('/funciones/6')
      .send({ precio: 9000 })
      .expect(200);

    expect(respuesta.body.precio).toBe(9000);
    expect(funcion.update.mock.calls[0][0].data.salaId).toBeUndefined();
    expect(funcion.findUnique).not.toHaveBeenCalled();
  });

  it('PATCH /funciones/:id responde 404 si no existe y 409 si hay un choque de horario', async () => {
    funcion.update.mockRejectedValueOnce({ code: 'P2025' });
    funcion.update.mockRejectedValueOnce({ code: 'P2002' });

    await request(app.getHttpServer())
      .patch('/funciones/99')
      .send({ precio: 1 })
      .expect(404);
    await request(app.getHttpServer())
      .patch('/funciones/6')
      .send({ iniciaEn: '2026-11-20T19:20:00-03:00' })
      .expect(409);
  });

  it('PATCH /funciones/:id no deja cambiar la sala si ya hay entradas vendidas', async () => {
    funcion.findUnique.mockResolvedValue({
      salaId: 9,
      _count: { entradas: 2 },
    });

    await request(app.getHttpServer())
      .patch('/funciones/6')
      .send({ salaId: 10 })
      .expect(409);
    expect(funcion.update).not.toHaveBeenCalled();
  });

  it('PATCH /funciones/:id deja cambiar la sala si no hay entradas y responde 404 si la función no existe', async () => {
    funcion.findUnique.mockResolvedValueOnce({
      salaId: 9,
      _count: { entradas: 0 },
    });
    funcion.update.mockResolvedValue({ ...funcionEnBase, salaId: 10 });
    funcion.findUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .patch('/funciones/6')
      .send({ salaId: 10 })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/funciones/99')
      .send({ salaId: 10 })
      .expect(404);
  });

  it('DELETE /funciones/:id elimina la función, responde 404 si no existe y 409 si tiene entradas vendidas', async () => {
    funcion.delete.mockResolvedValueOnce(funcionEnBase);
    funcion.delete.mockRejectedValueOnce({ code: 'P2025' });
    funcion.delete.mockRejectedValueOnce({ code: 'P2003' });

    const eliminada = await request(app.getHttpServer())
      .delete('/funciones/6')
      .expect(200);

    expect(eliminada.body.id).toBe(6);
    await request(app.getHttpServer()).delete('/funciones/99').expect(404);
    await request(app.getHttpServer()).delete('/funciones/6').expect(409);
  });
});
