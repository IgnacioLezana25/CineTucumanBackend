import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';
import { cifrarContrasena } from './../src/modules/users/contrasena.util.js';

const usuarioEnBase = {
  id: 7,
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana.perez@test.com',
  rol: 'cliente',
  creadoEn: new Date('2026-11-19T12:00:00.000Z'),
};

const cuerpoDeRegistro = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana.perez@test.com',
  contrasena: 'Clave12345',
};

function leerPayload(token: string) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const usuario = {
    create: vi.fn(),
    findUnique: vi.fn(),
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
    jwt = app.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/register crea un cliente y devuelve el token sin la contraseña', async () => {
    usuario.create.mockResolvedValue(usuarioEnBase);

    const respuesta = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...cuerpoDeRegistro,
        nombre: ' Ana ',
        correo: 'Ana.Perez@Test.com',
      })
      .expect(201);

    const datos = usuario.create.mock.calls[0][0].data;

    expect(datos).toMatchObject({
      nombre: 'Ana',
      correo: 'ana.perez@test.com',
      rol: 'cliente',
    });
    expect(datos.contrasenaHash).toMatch(/^\$2[aby]\$10\$/);
    expect(datos.contrasenaHash).not.toContain('Clave12345');
    expect(respuesta.body.usuario).toMatchObject({ id: 7, rol: 'cliente' });
    expect(JSON.stringify(respuesta.body)).not.toContain('contrasena');
    expect(leerPayload(respuesta.body.access_token)).toMatchObject({
      sub: 7,
      correo: 'ana.perez@test.com',
      rol: 'cliente',
    });
  });

  it('POST /auth/register rechaza con 400 a quien intenta elegir su rol', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...cuerpoDeRegistro, rol: 'admin' })
      .expect(400);

    expect(usuario.create).not.toHaveBeenCalled();
  });

  it('POST /auth/register con datos inválidos responde 400 y no toca la base', async () => {
    const cuerposInvalidos = [
      { ...cuerpoDeRegistro, correo: 'no-es-un-correo' },
      { ...cuerpoDeRegistro, contrasena: 'corta' },
      { ...cuerpoDeRegistro, contrasena: 'x'.repeat(73) },
      { ...cuerpoDeRegistro, nombre: '' },
      { ...cuerpoDeRegistro, apellido: undefined },
    ];

    for (const cuerpo of cuerposInvalidos) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(cuerpo)
        .expect(400);
    }

    expect(usuario.create).not.toHaveBeenCalled();
  });

  it('POST /auth/register con un correo repetido responde 409', async () => {
    usuario.create.mockRejectedValue({ code: 'P2002' });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(cuerpoDeRegistro)
      .expect(409);
  });

  it('POST /auth/login con las credenciales correctas devuelve el token', async () => {
    usuario.findUnique.mockResolvedValue({
      ...usuarioEnBase,
      contrasenaHash: await cifrarContrasena('Clave12345'),
    });

    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'Ana.Perez@Test.com', contrasena: 'Clave12345' })
      .expect(200);

    expect(usuario.findUnique.mock.calls[0][0].where).toEqual({
      correo: 'ana.perez@test.com',
    });
    expect(respuesta.body.usuario).toMatchObject({
      id: 7,
      correo: 'ana.perez@test.com',
    });
    expect(JSON.stringify(respuesta.body)).not.toContain('contrasena');
    expect(leerPayload(respuesta.body.access_token).sub).toBe(7);
  });

  it('POST /auth/login con contraseña equivocada o correo inexistente responde 401 con el mismo mensaje', async () => {
    usuario.findUnique.mockResolvedValueOnce({
      ...usuarioEnBase,
      contrasenaHash: await cifrarContrasena('Clave12345'),
    });
    usuario.findUnique.mockResolvedValueOnce(null);

    const equivocada = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'ana.perez@test.com', contrasena: 'otra-clave' })
      .expect(401);
    const inexistente = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'nadie@test.com', contrasena: 'Clave12345' })
      .expect(401);

    expect(equivocada.body.message).toBe('Correo o contraseña incorrectos.');
    expect(inexistente.body.message).toBe(equivocada.body.message);
  });

  it('POST /auth/login sin datos o con un correo inválido responde 400', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'abc', contrasena: 'Clave12345' })
      .expect(400);

    expect(usuario.findUnique).not.toHaveBeenCalled();
  });

  it('GET /auth/perfil con un token válido devuelve el usuario', async () => {
    usuario.findUnique.mockResolvedValue(usuarioEnBase);
    const token = await jwt.signAsync({
      sub: 7,
      correo: usuarioEnBase.correo,
      rol: 'cliente',
    });

    const respuesta = await request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(respuesta.body).toMatchObject({ id: 7, rol: 'cliente' });
    expect(usuario.findUnique.mock.calls[0][0].where).toEqual({ id: 7 });
  });

  it('GET /auth/perfil sin token, con un token roto, vencido o de otro secreto responde 401', async () => {
    const vencido = await jwt.signAsync(
      { sub: 7, correo: usuarioEnBase.correo, rol: 'cliente' },
      { expiresIn: -10 },
    );
    const deOtroSecreto = await new JwtService({
      secret: 'otro-secreto-distinto-de-al-menos-32-caracteres',
    }).signAsync({ sub: 7, correo: usuarioEnBase.correo, rol: 'admin' });

    await request(app.getHttpServer()).get('/auth/perfil').expect(401);
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Bearer ${vencido}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Bearer ${deOtroSecreto}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Basic ${vencido}`)
      .expect(401);

    expect(usuario.findUnique).not.toHaveBeenCalled();
  });
});
