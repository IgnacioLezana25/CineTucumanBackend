import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

const productoEnBase = {
  id: 1,
  slug: 'combo-clasico',
  nombre: 'Combo Clásico',
  descripcion: 'Pochoclos grande + gaseosa mediana',
  categoria: 'combo',
  precio: '6000',
  activo: true,
};

const cuerpoValido = {
  slug: 'combo-clasico',
  nombre: 'Combo Clásico',
  categoria: 'combo',
  precio: 6000,
};

describe('Productos (e2e)', () => {
  let app: INestApplication<App>;
  let tokenAdmin: string;
  const producto = {
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
      .useValue({ producto })
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

  it('GET /productos devuelve el precio como número y aplica los filtros', async () => {
    producto.findMany.mockResolvedValue([productoEnBase]);

    const respuesta = await request(app.getHttpServer())
      .get('/productos?categoria=combo&activo=true')
      .expect(200);

    expect(respuesta.body[0].precio).toBe(6000);
    expect(producto.findMany.mock.calls[0][0].where).toEqual({
      categoria: 'combo',
      activo: true,
    });
  });

  it('GET /productos con una categoría inválida responde 400', async () => {
    await request(app.getHttpServer())
      .get('/productos?categoria=otra')
      .expect(400);
  });

  it('GET /productos/:id y /productos/slug/:slug inexistentes responden 404', async () => {
    producto.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer()).get('/productos/99').expect(404);
    await request(app.getHttpServer())
      .get('/productos/slug/no-existe')
      .expect(404);
    await request(app.getHttpServer()).get('/productos/abc').expect(400);
  });

  it('POST /productos válido responde 201', async () => {
    producto.create.mockResolvedValue(productoEnBase);

    const respuesta = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoValido)
      .expect(201);

    expect(respuesta.body.slug).toBe('combo-clasico');
    expect(producto.create.mock.calls[0][0].data.descripcion).toBeNull();
  });

  it('POST /productos con datos inválidos responde 400 y no toca la base', async () => {
    const invalidos = [
      { ...cuerpoValido, precio: -5 },
      { ...cuerpoValido, precio: 'barato' },
      { ...cuerpoValido, categoria: 'otra' },
      { ...cuerpoValido, activo: 'si' },
      { ...cuerpoValido, nombre: undefined },
    ];

    for (const cuerpo of invalidos) {
      await request(app.getHttpServer())
        .post('/productos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(cuerpo)
        .expect(400);
    }

    expect(producto.create).not.toHaveBeenCalled();
  });

  it('POST /productos con slug repetido responde 409', async () => {
    producto.create.mockRejectedValue({ code: 'P2002' });

    await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoValido)
      .expect(409);
  });

  it('PATCH /productos/:id no modifica un campo obligatorio enviado como null', async () => {
    producto.update.mockResolvedValue(productoEnBase);

    await request(app.getHttpServer())
      .patch('/productos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: null, activo: false })
      .expect(200);

    const datos = producto.update.mock.calls[0][0].data;

    expect(datos.nombre).toBeUndefined();
    expect(datos.activo).toBe(false);
  });

  it('PATCH /productos/:id inexistente responde 404', async () => {
    producto.update.mockRejectedValue({ code: 'P2025' });

    await request(app.getHttpServer())
      .patch('/productos/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ activo: false })
      .expect(404);
  });

  it('DELETE /productos/:id que figura en órdenes responde 409', async () => {
    producto.delete.mockRejectedValueOnce({ code: 'P2003' });
    producto.delete.mockResolvedValueOnce(productoEnBase);

    await request(app.getHttpServer())
      .delete('/productos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409);
    await request(app.getHttpServer())
      .delete('/productos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
  });
});
