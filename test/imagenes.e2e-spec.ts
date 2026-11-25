import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const jpg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32),
]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBPVP8 '),
  Buffer.alloc(32),
]);

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
  generos: [],
  reparto: [],
};

const sucursalEnBase = {
  id: 4,
  slug: 'sunstar-cinemas',
  nombre: 'Sunstar Cinemas',
  ciudadId: 2,
  direccion: 'Avenida Fermín Cariola 42',
  descripcion: null,
  referencia: null,
  imagenArchivo: 'sunstar-cinemas.jpg',
  destacada: true,
  ciudad: { id: 2, nombre: 'Yerba Buena', provincia: 'Tucumán' },
  enlaces: [],
};

describe('Imágenes subidas (e2e)', () => {
  let app: INestApplication<App>;
  let carpeta: string;
  let tokenAdmin: string;
  let tokenCliente: string;
  const pelicula = {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const sucursal = {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const archivosDe = async (nombre: string) =>
    existsSync(join(carpeta, nombre)) ? readdir(join(carpeta, nombre)) : [];

  beforeAll(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'cine-subidas-'));
    process.env.UPLOADS_DIR = carpeta;
  });

  afterAll(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(carpeta, { recursive: true, force: true });
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    await rm(carpeta, { recursive: true, force: true });
    await mkdir(carpeta, { recursive: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ pelicula, sucursal })
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
    tokenAdmin = await jwt.signAsync({
      sub: 5,
      correo: 'admin@test.com',
      rol: 'admin',
    });
    tokenCliente = await jwt.signAsync({
      sub: 7,
      correo: 'ana@test.com',
      rol: 'cliente',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  const subirPoster = (id = 1, token = tokenAdmin) =>
    request(app.getHttpServer())
      .post(`/peliculas/${id}/poster`)
      .set('Authorization', `Bearer ${token}`);

  it('guarda el póster con un nombre generado y actualiza la película', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);
    pelicula.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...peliculaEnBase, posterArchivo: data.posterArchivo }),
    );

    const respuesta = await subirPoster()
      .attach('archivo', png, { filename: '../../mi poster.png' })
      .expect(200);

    const guardados = await archivosDe('peliculas');
    const posterArchivo = pelicula.update.mock.calls[0][0].data.posterArchivo;

    expect(posterArchivo).toMatch(/^toy-story-5-[0-9a-f]{12}\.png$/);
    expect(guardados).toEqual([posterArchivo]);
    expect(respuesta.body.posterArchivo).toBe(posterArchivo);
    expect(respuesta.body.posterUrl).toMatch(
      new RegExp(`/imagenes/peliculas/${posterArchivo}$`),
    );
  });

  it('acepta JPG y WebP y le pone la extensión según el contenido, no según el nombre', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);
    pelicula.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...peliculaEnBase, posterArchivo: data.posterArchivo }),
    );

    await subirPoster()
      .attach('archivo', jpg, { filename: 'a.png' })
      .expect(200);
    await subirPoster()
      .attach('archivo', webp, { filename: 'b.jpg' })
      .expect(200);

    const extensiones = pelicula.update.mock.calls.map((llamada) =>
      llamada[0].data.posterArchivo.split('.').pop(),
    );

    expect(extensiones).toEqual(['jpg', 'webp']);
  });

  it('borra el póster subido anterior pero no toca los del proyecto', async () => {
    await mkdir(join(carpeta, 'peliculas'), { recursive: true });
    await writeFile(join(carpeta, 'peliculas', 'anterior.png'), png);
    pelicula.findUnique.mockResolvedValueOnce({
      ...peliculaEnBase,
      posterArchivo: 'anterior.png',
    });
    pelicula.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...peliculaEnBase, posterArchivo: data.posterArchivo }),
    );

    await subirPoster()
      .attach('archivo', png, { filename: 'a.png' })
      .expect(200);

    expect(await archivosDe('peliculas')).toHaveLength(1);
    expect(await archivosDe('peliculas')).not.toContain('anterior.png');

    pelicula.findUnique.mockResolvedValueOnce(peliculaEnBase);

    await subirPoster()
      .attach('archivo', png, { filename: 'b.png' })
      .expect(200);

    expect(await archivosDe('peliculas')).toHaveLength(2);
  });

  it('rechaza lo que no es una imagen aunque diga serlo, y no guarda nada', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);

    const casos = [
      Buffer.from('esto es texto'),
      Buffer.from('GIF89a......'),
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    ];

    for (const caso of casos) {
      await subirPoster()
        .attach('archivo', caso, {
          filename: 'poster.png',
          contentType: 'image/png',
        })
        .expect(400);
    }

    expect(pelicula.update).not.toHaveBeenCalled();
    expect(await archivosDe('peliculas')).toEqual([]);
  });

  it('responde 400 si falta el archivo o se envía con otro nombre de campo', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);

    await subirPoster().expect(400);
    await subirPoster().attach('foto', png, { filename: 'a.png' }).expect(400);
    await subirPoster().field('archivo', 'texto').expect(400);

    expect(pelicula.update).not.toHaveBeenCalled();
  });

  it('responde 413 si la imagen pesa más de 5 MB', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);

    await subirPoster()
      .attach('archivo', Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]), {
        filename: 'grande.png',
      })
      .expect(413);

    expect(pelicula.update).not.toHaveBeenCalled();
    expect(await archivosDe('peliculas')).toEqual([]);
  });

  it('responde 404 si la película no existe y 400 si el id no es un número', async () => {
    pelicula.findUnique.mockResolvedValue(null);

    await subirPoster(99)
      .attach('archivo', png, { filename: 'a.png' })
      .expect(404);
    await request(app.getHttpServer())
      .post('/peliculas/abc/poster')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('archivo', png, { filename: 'a.png' })
      .expect(400);

    expect(await archivosDe('peliculas')).toEqual([]);
  });

  it('si la base falla al guardar, borra la imagen que acababa de escribir', async () => {
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);
    pelicula.update.mockRejectedValue(new Error('Se cortó la conexión.'));

    await subirPoster()
      .attach('archivo', png, { filename: 'a.png' })
      .expect(500);

    expect(await archivosDe('peliculas')).toEqual([]);
  });

  it('pide token de administrador antes de recibir el archivo', async () => {
    await request(app.getHttpServer())
      .post('/peliculas/1/poster')
      .attach('archivo', png, { filename: 'a.png' })
      .expect(401);
    await subirPoster(1, tokenCliente)
      .attach('archivo', png, { filename: 'a.png' })
      .expect(403);

    expect(pelicula.findUnique).not.toHaveBeenCalled();
    expect(await archivosDe('peliculas')).toEqual([]);
  });

  it('DELETE /peliculas/:id borra también el póster subido', async () => {
    await mkdir(join(carpeta, 'peliculas'), { recursive: true });
    await writeFile(join(carpeta, 'peliculas', 'subido.png'), png);
    pelicula.findUnique.mockResolvedValue(peliculaEnBase);
    pelicula.delete.mockResolvedValue({
      ...peliculaEnBase,
      posterArchivo: 'subido.png',
    });

    await request(app.getHttpServer())
      .delete('/peliculas/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(await archivosDe('peliculas')).toEqual([]);
  });

  it('POST /sucursales/:id/imagen guarda la imagen en su carpeta y borra la anterior subida', async () => {
    await mkdir(join(carpeta, 'sucursales'), { recursive: true });
    await writeFile(join(carpeta, 'sucursales', 'anterior.png'), png);
    sucursal.findUnique.mockResolvedValue({
      ...sucursalEnBase,
      imagenArchivo: 'anterior.png',
    });
    sucursal.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...sucursalEnBase, imagenArchivo: data.imagenArchivo }),
    );

    const respuesta = await request(app.getHttpServer())
      .post('/sucursales/4/imagen')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('archivo', webp, { filename: 'fachada.webp' })
      .expect(200);

    expect(respuesta.body.imagenArchivo).toMatch(
      /^sunstar-cinemas-[0-9a-f]{12}\.webp$/,
    );
    expect(respuesta.body.imagenUrl).toContain('/imagenes/sucursales/');
    expect(await archivosDe('sucursales')).toEqual([
      respuesta.body.imagenArchivo,
    ]);
  });

  it('POST /sucursales/:id/imagen responde 404, 400, 401 y 403 según el caso', async () => {
    sucursal.findUnique.mockResolvedValueOnce(null);
    sucursal.findUnique.mockResolvedValueOnce(sucursalEnBase);

    await request(app.getHttpServer())
      .post('/sucursales/99/imagen')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('archivo', png, { filename: 'a.png' })
      .expect(404);
    await request(app.getHttpServer())
      .post('/sucursales/4/imagen')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('archivo', Buffer.from('texto'), { filename: 'a.png' })
      .expect(400);
    await request(app.getHttpServer()).post('/sucursales/4/imagen').expect(401);
    await request(app.getHttpServer())
      .post('/sucursales/4/imagen')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(403);

    expect(sucursal.update).not.toHaveBeenCalled();
    expect(await archivosDe('sucursales')).toEqual([]);
  });
});
