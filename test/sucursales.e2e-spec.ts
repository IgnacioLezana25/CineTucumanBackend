import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

const sucursalEnBase = {
  id: 4,
  slug: 'sunstar-cinemas',
  nombre: 'Sunstar Cinemas',
  ciudadId: 2,
  direccion: 'Avenida Fermín Cariola 42',
  descripcion: null,
  referencia: 'Portal de Tucumán Shopping.',
  imagenArchivo: 'sunstar-cinemas.jpg',
  destacada: true,
  ciudad: { id: 2, nombre: 'Yerba Buena', provincia: 'Tucumán' },
  enlaces: [
    { sucursalId: 4, tipo: 'sitio', url: 'https://www.cinesunstar.com/' },
  ],
};

const cuerpoValido = {
  slug: 'sunstar-cinemas',
  nombre: 'Sunstar Cinemas',
  ciudadId: 2,
  direccion: 'Avenida Fermín Cariola 42',
};

describe('Sucursales (e2e)', () => {
  let app: INestApplication<App>;
  let tokenAdmin: string;
  const sucursal = {
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
      .useValue({ sucursal })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
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

  it('GET /sucursales devuelve la ciudad, la imagen como URL y los enlaces', async () => {
    sucursal.findMany.mockResolvedValue([sucursalEnBase]);

    const respuesta = await request(app.getHttpServer())
      .get('/sucursales?destacada=true')
      .expect(200);

    expect(respuesta.body[0]).toMatchObject({
      slug: 'sunstar-cinemas',
      ciudad: 'Yerba Buena',
      provincia: 'Tucumán',
      referencia: 'Portal de Tucumán Shopping.',
      imagenUrl:
        'http://localhost:4000/imagenes/sucursales/sunstar-cinemas.jpg',
      enlaces: [{ tipo: 'sitio', url: 'https://www.cinesunstar.com/' }],
    });
    expect(sucursal.findMany.mock.calls[0][0].where.destacada).toBe(true);
  });

  it('GET /sucursales con un filtro inválido responde 400', async () => {
    await request(app.getHttpServer())
      .get('/sucursales?destacada=si')
      .expect(400);
  });

  it('GET /sucursales/:id inexistente responde 404 y con texto responde 400', async () => {
    sucursal.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer()).get('/sucursales/99').expect(404);
    await request(app.getHttpServer()).get('/sucursales/abc').expect(400);
  });

  it('GET /sucursales/slug/:slug devuelve la sucursal', async () => {
    sucursal.findUnique.mockResolvedValue(sucursalEnBase);

    const respuesta = await request(app.getHttpServer())
      .get('/sucursales/slug/sunstar-cinemas')
      .expect(200);

    expect(respuesta.body.id).toBe(4);
  });

  it('POST /sucursales con un enlace sin https responde 400', async () => {
    await request(app.getHttpServer())
      .post('/sucursales')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        ...cuerpoValido,
        enlaces: [{ tipo: 'sitio', url: 'ejemplo.com' }],
      })
      .expect(400);

    expect(sucursal.create).not.toHaveBeenCalled();
  });

  it('POST /sucursales válido responde 201 y guarda los enlaces', async () => {
    sucursal.create.mockResolvedValue(sucursalEnBase);

    await request(app.getHttpServer())
      .post('/sucursales')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        ...cuerpoValido,
        referencia: 'Portal de Tucumán Shopping.',
        enlaces: [{ tipo: 'sitio', url: 'https://www.cinesunstar.com/' }],
      })
      .expect(201);

    const datos = sucursal.create.mock.calls[0][0].data;

    expect(datos.referencia).toBe('Portal de Tucumán Shopping.');

    expect(datos.enlaces).toEqual({
      create: [{ tipo: 'sitio', url: 'https://www.cinesunstar.com/' }],
    });
    expect(datos.descripcion).toBeNull();
  });

  it('POST /sucursales con slug repetido responde 409 y con ciudad inexistente 400', async () => {
    sucursal.create.mockRejectedValueOnce({ code: 'P2002' });
    sucursal.create.mockRejectedValueOnce({ code: 'P2003' });

    await request(app.getHttpServer())
      .post('/sucursales')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoValido)
      .expect(409);
    await request(app.getHttpServer())
      .post('/sucursales')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoValido)
      .expect(400);
  });

  it('PATCH /sucursales/:id con una lista de enlaces la reemplaza', async () => {
    sucursal.update.mockResolvedValue(sucursalEnBase);

    await request(app.getHttpServer())
      .patch('/sucursales/4')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ enlaces: [] })
      .expect(200);

    expect(sucursal.update.mock.calls[0][0].data.enlaces).toEqual({
      deleteMany: {},
      create: [],
    });
  });

  it('PATCH /sucursales/:id inexistente responde 404', async () => {
    sucursal.update.mockRejectedValue({ code: 'P2025' });

    await request(app.getHttpServer())
      .patch('/sucursales/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Nuevo' })
      .expect(404);
  });

  it('DELETE /sucursales/:id con funciones responde 409 y sin ellas devuelve la sucursal', async () => {
    sucursal.delete.mockRejectedValueOnce({ code: 'P2003' });
    sucursal.delete.mockResolvedValueOnce(sucursalEnBase);

    await request(app.getHttpServer())
      .delete('/sucursales/4')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409);
    await request(app.getHttpServer())
      .delete('/sucursales/4')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
  });
});
