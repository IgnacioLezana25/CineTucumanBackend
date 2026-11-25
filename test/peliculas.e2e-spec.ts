import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';
import { errorDePrisma } from './error-de-prisma.js';

const peliculaEnBase = {
  id: 1,
  slug: 'toy-story-5',
  titulo: 'Toy Story 5',
  tituloOriginal: null,
  sinopsis: null,
  duracionMinutos: 107,
  clasificacionId: 1,
  estado: 'en-cartelera',
  destacada: true,
  fechaEstreno: new Date('2026-07-30T00:00:00.000Z'),
  posterArchivo: 'toy-story-5.jpg',
  trailerYoutube: null,
  director: null,
  paisOrigen: null,
  clasificacion: { id: 1, nombre: 'ATP' },
  generos: [
    { peliculaId: 1, generoId: 4, genero: { id: 4, nombre: 'Animación' } },
  ],
  reparto: [
    {
      peliculaId: 1,
      orden: 1,
      nombre: 'Tom Hanks',
      fotoArchivo: 'tom-hanks.jpg',
    },
    { peliculaId: 1, orden: 2, nombre: 'Tim Allen', fotoArchivo: null },
  ],
};

const cuerpoValido = {
  slug: 'toy-story-5',
  titulo: 'Toy Story 5',
  estado: 'en-cartelera',
  posterArchivo: 'toy-story-5.jpg',
};

describe('Peliculas (e2e)', () => {
  let app: INestApplication<App>;
  let tokenAdmin: string;
  const pelicula = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ pelicula })
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

    tokenAdmin = await app.get(JwtService).signAsync({
      sub: 5,
      correo: 'admin@test.com',
      rol: 'admin',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /peliculas devuelve las películas con el póster como URL', async () => {
    pelicula.findMany.mockResolvedValue([peliculaEnBase]);

    const respuesta = await request(app.getHttpServer())
      .get('/peliculas?estado=en-cartelera')
      .expect(200);

    expect(respuesta.body).toHaveLength(1);
    expect(respuesta.body[0]).toMatchObject({
      slug: 'toy-story-5',
      clasificacion: 'ATP',
      fechaEstreno: '2026-07-30',
      generos: ['Animación'],
      posterUrl: 'http://localhost:4000/imagenes/peliculas/toy-story-5.jpg',
      reparto: [
        {
          nombre: 'Tom Hanks',
          fotoArchivo: 'tom-hanks.jpg',
          fotoUrl: 'http://localhost:4000/imagenes/reparto/tom-hanks.jpg',
        },
        { nombre: 'Tim Allen', fotoArchivo: null, fotoUrl: null },
      ],
    });
    expect(pelicula.findMany.mock.calls[0][0].where.estado).toBe(
      'en-cartelera',
    );
  });

  it('GET /peliculas con un estado inválido responde 400', async () => {
    await request(app.getHttpServer())
      .get('/peliculas?estado=otra')
      .expect(400);
    expect(pelicula.findMany).not.toHaveBeenCalled();
  });

  it('GET /peliculas/:id con texto responde 400', async () => {
    await request(app.getHttpServer()).get('/peliculas/abc').expect(400);
  });

  it('GET /peliculas/:id inexistente responde 404', async () => {
    pelicula.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer()).get('/peliculas/99').expect(404);
  });

  it('GET /peliculas/slug/:slug devuelve la película', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);

    const respuesta = await request(app.getHttpServer())
      .get('/peliculas/slug/toy-story-5')
      .expect(200);

    expect(respuesta.body.id).toBe(1);
    expect(pelicula.findUnique.mock.calls[0][0].where).toEqual({
      slug: 'toy-story-5',
    });
  });

  it('POST /peliculas sin título responde 400 y no toca la base', async () => {
    await request(app.getHttpServer())
      .post('/peliculas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...cuerpoValido, titulo: undefined })
      .expect(400);

    expect(pelicula.create).not.toHaveBeenCalled();
  });

  it('POST /peliculas válido responde 201 y guarda los géneros', async () => {
    pelicula.create.mockResolvedValue(peliculaEnBase);

    await request(app.getHttpServer())
      .post('/peliculas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...cuerpoValido, fechaEstreno: '2026-07-30', generoIds: [4] })
      .expect(201);

    const datos = pelicula.create.mock.calls[0][0].data;

    expect(datos.fechaEstreno).toEqual(new Date('2026-07-30T00:00:00.000Z'));
    expect(datos.generos).toEqual({ create: [{ generoId: 4 }] });
    expect(datos.sinopsis).toBeUndefined();
  });

  it('POST /peliculas con reparto lo guarda numerado en el orden recibido', async () => {
    pelicula.create.mockResolvedValue(peliculaEnBase);

    await request(app.getHttpServer())
      .post('/peliculas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        ...cuerpoValido,
        reparto: [
          { nombre: 'Tom Hanks', fotoArchivo: 'tom-hanks.jpg' },
          { nombre: 'Tim Allen' },
        ],
      })
      .expect(201);

    expect(pelicula.create.mock.calls[0][0].data.reparto).toEqual({
      create: [
        { orden: 1, nombre: 'Tom Hanks', fotoArchivo: 'tom-hanks.jpg' },
        { orden: 2, nombre: 'Tim Allen', fotoArchivo: null },
      ],
    });
  });

  it('POST /peliculas sin reparto guarda una lista vacía', async () => {
    pelicula.create.mockResolvedValue(peliculaEnBase);

    await request(app.getHttpServer())
      .post('/peliculas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoValido)
      .expect(201);

    expect(pelicula.create.mock.calls[0][0].data.reparto).toEqual({
      create: [],
    });
  });

  it('POST /peliculas con reparto inválido responde 400', async () => {
    const repartosInvalidos = [
      [{ nombre: '' }],
      [{ nombre: 'Tom Hanks' }, { nombre: 'Tom Hanks' }],
      [{ fotoArchivo: 'sin-nombre.jpg' }],
      'Tom Hanks',
    ];

    for (const reparto of repartosInvalidos) {
      await request(app.getHttpServer())
        .post('/peliculas')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ ...cuerpoValido, reparto })
        .expect(400);
    }

    expect(pelicula.create).not.toHaveBeenCalled();
  });

  it('POST /peliculas con un slug repetido responde 409', async () => {
    pelicula.create.mockRejectedValue(errorDePrisma('P2002'));

    await request(app.getHttpServer())
      .post('/peliculas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoValido)
      .expect(409);
  });

  it('POST /peliculas con una clasificación inexistente responde 400', async () => {
    pelicula.create.mockRejectedValue(errorDePrisma('P2003'));

    await request(app.getHttpServer())
      .post('/peliculas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...cuerpoValido, clasificacionId: 999 })
      .expect(400);
  });

  it('PATCH /peliculas/:id inexistente responde 404', async () => {
    pelicula.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .patch('/peliculas/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ titulo: 'Nuevo' })
      .expect(404);
  });

  it('PATCH /peliculas/:id con null en un campo obligatorio no lo modifica', async () => {
    pelicula.update.mockResolvedValue(peliculaEnBase);

    await request(app.getHttpServer())
      .patch('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ titulo: null, sinopsis: null })
      .expect(200);

    const datos = pelicula.update.mock.calls[0][0].data;

    expect(datos.titulo).toBeUndefined();
    expect(datos.sinopsis).toBeNull();
  });

  it('PATCH /peliculas/:id con reparto lo reemplaza y con una lista vacía lo borra', async () => {
    pelicula.update.mockResolvedValue(peliculaEnBase);

    await request(app.getHttpServer())
      .patch('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ reparto: [{ nombre: 'Tim Allen' }] })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ reparto: [] })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ titulo: 'Nuevo' })
      .expect(200);

    expect(pelicula.update.mock.calls[0][0].data.reparto).toEqual({
      deleteMany: {},
      create: [{ orden: 1, nombre: 'Tim Allen', fotoArchivo: null }],
    });
    expect(pelicula.update.mock.calls[1][0].data.reparto).toEqual({
      deleteMany: {},
      create: [],
    });
    expect(pelicula.update.mock.calls[2][0].data.reparto).toBeUndefined();
  });

  it('DELETE /peliculas/:id con funciones responde 409', async () => {
    pelicula.delete.mockRejectedValue(errorDePrisma('P2003'));

    await request(app.getHttpServer())
      .delete('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409);
  });

  it('DELETE /peliculas/:id devuelve la película eliminada', async () => {
    pelicula.delete.mockResolvedValue(peliculaEnBase);

    const respuesta = await request(app.getHttpServer())
      .delete('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(respuesta.body.slug).toBe('toy-story-5');
  });
});
