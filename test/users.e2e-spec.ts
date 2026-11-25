import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';
import { errorDePrisma } from './error-de-prisma.js';
import * as bcrypt from 'bcrypt';

const cliente = {
  id: 7,
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana.perez@test.com',
  rol: 'cliente',
  creadoEn: new Date('2026-11-19T12:00:00.000Z'),
};

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let tokenCliente: string;
  let tokenAdmin: string;
  const usuario = {
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
      .useValue({ usuario })
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
      correo: cliente.correo,
      rol: 'cliente',
    });
    tokenAdmin = await jwt.signAsync({
      sub: 5,
      correo: 'admin@cinetucuman.test',
      rol: 'admin',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('todas las rutas piden token', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
    await request(app.getHttpServer()).get('/users/7').expect(401);
    await request(app.getHttpServer()).patch('/users/7').send({}).expect(401);
    await request(app.getHttpServer()).delete('/users/7').expect(401);
  });

  it('no existe una ruta para crear usuarios fuera de /auth/register', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({})
      .expect(404);
  });

  it('GET /users lo ve el administrador y un cliente recibe 403', async () => {
    usuario.findMany.mockResolvedValue([cliente]);

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(403);

    const respuesta = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(respuesta.body).toHaveLength(1);
    expect(JSON.stringify(respuesta.body)).not.toContain('contrasena');
    expect(usuario.findMany.mock.calls[0][0].omit).toEqual({
      contrasenaHash: true,
    });
  });

  it('GET /users/:id lo ve su dueño o un administrador, y otro cliente recibe 403', async () => {
    usuario.findUnique.mockResolvedValue(cliente);

    await request(app.getHttpServer())
      .get('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/users/7')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/users/5')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(403);
  });

  it('GET /users/:id inexistente responde 404 y con texto 400', async () => {
    usuario.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/users/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/users/abc')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(400);
  });

  it('PATCH /users/:id deja a un cliente cambiar su nombre pero no su rol', async () => {
    usuario.findUnique.mockResolvedValue(cliente);
    usuario.update.mockResolvedValue({ ...cliente, nombre: 'Anita' });

    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ nombre: 'Anita' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ rol: 'admin' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/users/5')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ nombre: 'Otro' })
      .expect(403);

    expect(usuario.update).toHaveBeenCalledTimes(1);
    expect(usuario.update.mock.calls[0][0].data.rol).toBeUndefined();
  });

  it('PATCH /users/:id pide la contraseña actual a un cliente que cambia la suya', async () => {
    usuario.findUnique.mockResolvedValue({
      ...cliente,
      contrasenaHash: await bcrypt.hash('Clave12345', 10),
    });
    usuario.update.mockResolvedValue(cliente);

    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ contrasena: 'NuevaClave123' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ contrasena: 'NuevaClave123', contrasenaActual: 'incorrecta' })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ contrasena: 'NuevaClave123', contrasenaActual: 'Clave12345' })
      .expect(200);

    const datos = usuario.update.mock.calls[0][0].data;

    expect(usuario.update).toHaveBeenCalledTimes(1);
    expect(datos.contrasenaHash).toMatch(/^\$2[aby]\$10\$/);
    expect(datos.contrasenaHash).not.toContain('NuevaClave123');
  });

  it('PATCH /users/:id deja al administrador cambiar el rol y la contraseña sin la actual', async () => {
    usuario.findUnique.mockResolvedValue(cliente);
    usuario.update.mockResolvedValue({ ...cliente, rol: 'admin' });

    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'admin', contrasena: 'NuevaClave123' })
      .expect(200);

    expect(usuario.update.mock.calls[0][0].data.rol).toBe('admin');
    expect(usuario.findUnique).toHaveBeenCalledTimes(1);
    expect(usuario.findUnique.mock.calls[0][0].omit).toEqual({
      contrasenaHash: true,
    });
  });

  it('PATCH /users/:id con datos inválidos responde 400 y con un usuario inexistente 404', async () => {
    usuario.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .patch('/users/7')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'dueño', contrasena: 'corta' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/users/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Nuevo' })
      .expect(404);
  });

  it('DELETE /users/:id es solo del administrador y responde 409 si el usuario tiene órdenes', async () => {
    usuario.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(where.id === 7 ? cliente : null),
    );
    usuario.delete.mockRejectedValueOnce(errorDePrisma('P2003'));
    usuario.delete.mockResolvedValueOnce(cliente);

    await request(app.getHttpServer())
      .delete('/users/7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/users/7')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409);
    await request(app.getHttpServer())
      .delete('/users/7')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete('/users/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);

    expect(usuario.delete).toHaveBeenCalledTimes(2);
  });
});
