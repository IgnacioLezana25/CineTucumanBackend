import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/modules/app/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);

const funcion = { id: 10, salaId: 3, iniciaEn: manana, precio: '8500.00' };
const butaca = (id: number, salaId = 3) => ({
  id,
  salaId,
  fila: 'B',
  numero: id - 100,
});
const producto = { id: 1, activo: true, precio: '6000.00' };

function ordenEnBase(sobrescribir: Record<string, unknown> = {}) {
  return {
    id: 20,
    numero: 'CT-ABCD2345',
    usuarioId: 7,
    estado: 'pagada',
    creadaEn: new Date('2026-11-19T15:00:00.000Z'),
    entradas: [
      {
        id: 1,
        ordenId: 20,
        funcionId: 10,
        butacaId: 103,
        precioUnitario: '8500.00',
        butaca: butaca(103),
        funcion: {
          ...funcion,
          iniciaEn: manana,
          pelicula: { titulo: 'Toy Story 5' },
          sala: { nombre: 'Sala 1', sucursal: { nombre: 'Sunstar Cinemas' } },
        },
      },
    ],
    productos: [
      {
        ordenId: 20,
        productoId: 1,
        cantidad: 2,
        precioUnitario: '6000.00',
        producto: { nombre: 'Combo Clásico' },
      },
    ],
    ...sobrescribir,
  };
}

describe('Ordenes (e2e)', () => {
  let app: INestApplication<App>;
  let tokenCliente: string;
  let tokenOtroCliente: string;
  let tokenAdmin: string;
  const prisma = {
    orden: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    funcion: { findMany: vi.fn() },
    butaca: { findMany: vi.fn() },
    producto: { findMany: vi.fn() },
    entrada: { deleteMany: vi.fn() },
    ordenProducto: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((operaciones) =>
      Promise.all(operaciones),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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
      correo: 'a@test.com',
      rol: 'cliente',
    });
    tokenOtroCliente = await jwt.signAsync({
      sub: 8,
      correo: 'b@test.com',
      rol: 'cliente',
    });
    tokenAdmin = await jwt.signAsync({
      sub: 5,
      correo: 'admin@test.com',
      rol: 'admin',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  const comprar = (cuerpo: object, token = tokenCliente) =>
    request(app.getHttpServer())
      .post('/ordenes')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);

  it('todas las rutas piden token', async () => {
    await request(app.getHttpServer()).post('/ordenes').send({}).expect(401);
    await request(app.getHttpServer()).get('/ordenes').expect(401);
    await request(app.getHttpServer()).get('/ordenes/20').expect(401);
    await request(app.getHttpServer())
      .patch('/ordenes/20/cancelar')
      .expect(401);
  });

  it('POST /ordenes crea la orden del usuario del token con los precios del servidor', async () => {
    prisma.funcion.findMany.mockResolvedValue([funcion]);
    prisma.butaca.findMany.mockResolvedValue([butaca(103)]);
    prisma.producto.findMany.mockResolvedValue([producto]);
    prisma.orden.create.mockResolvedValue(ordenEnBase());

    const respuesta = await comprar({
      entradas: [{ funcionId: 10, butacaId: 103 }],
      productos: [{ productoId: 1, cantidad: 2 }],
    }).expect(201);

    const datos = prisma.orden.create.mock.calls[0][0].data;

    expect(datos.usuarioId).toBe(7);
    expect(datos.estado).toBe('pagada');
    expect(datos.numero).toMatch(/^CT-[A-HJ-NP-Z2-9]{8}$/);
    expect(datos.entradas.create).toHaveLength(1);
    expect(datos.entradas.create[0]).toMatchObject({
      funcionId: 10,
      butacaId: 103,
    });
    expect(String(datos.entradas.create[0].precioUnitario)).toBe('8500');
    expect(String(datos.productos.create[0].precioUnitario)).toBe('6000');
    expect(respuesta.body).toMatchObject({
      numero: 'CT-ABCD2345',
      estado: 'pagada',
      total: 20500,
      entradas: [
        {
          pelicula: 'Toy Story 5',
          sucursal: 'Sunstar Cinemas',
          sala: 'Sala 1',
          butaca: 'B3',
          precioUnitario: 8500,
        },
      ],
      productos: [
        {
          productoId: 1,
          nombre: 'Combo Clásico',
          cantidad: 2,
          subtotal: 12000,
        },
      ],
    });
  });

  it('POST /ordenes rechaza con 400 a quien envía el usuario, el estado o los precios', async () => {
    const cuerposConDatosDeMas = [
      { usuarioId: 99, entradas: [{ funcionId: 10, butacaId: 103 }] },
      { estado: 'cancelada', productos: [{ productoId: 1, cantidad: 1 }] },
      { entradas: [{ funcionId: 10, butacaId: 103, precioUnitario: 1 }] },
      { productos: [{ productoId: 1, cantidad: 2, precio: 1 }] },
    ];

    for (const cuerpo of cuerposConDatosDeMas) {
      await comprar(cuerpo).expect(400);
    }

    expect(prisma.orden.create).not.toHaveBeenCalled();
  });

  it('POST /ordenes puede ser solo de Candy Bar o solo de entradas', async () => {
    prisma.funcion.findMany.mockResolvedValue([funcion]);
    prisma.butaca.findMany.mockResolvedValue([butaca(103)]);
    prisma.producto.findMany.mockResolvedValue([producto]);
    prisma.orden.create.mockResolvedValue(ordenEnBase());

    await comprar({ productos: [{ productoId: 1, cantidad: 1 }] }).expect(201);
    await comprar({ entradas: [{ funcionId: 10, butacaId: 103 }] }).expect(201);

    expect(prisma.orden.create.mock.calls[0][0].data.entradas.create).toEqual(
      [],
    );
    expect(prisma.orden.create.mock.calls[1][0].data.productos.create).toEqual(
      [],
    );
  });

  it('POST /ordenes sin entradas ni productos responde 400', async () => {
    await comprar({}).expect(400);

    expect(prisma.orden.create).not.toHaveBeenCalled();
  });

  it('POST /ordenes con datos inválidos responde 400 y no toca la base', async () => {
    const cuerposInvalidos = [
      { entradas: [] },
      { entradas: [{ funcionId: 10 }] },
      {
        entradas: [
          { funcionId: 10, butacaId: 103 },
          { funcionId: 10, butacaId: 103 },
        ],
      },
      {
        entradas: Array.from({ length: 7 }, (_, i) => ({
          funcionId: 10,
          butacaId: 100 + i,
        })),
      },
      { productos: [{ productoId: 1, cantidad: 0 }] },
      { productos: [{ productoId: 1, cantidad: 11 }] },
      {
        productos: [
          { productoId: 1, cantidad: 1 },
          { productoId: 1, cantidad: 2 },
        ],
      },
      { productos: 'combo' },
    ];

    for (const cuerpo of cuerposInvalidos) {
      await comprar(cuerpo).expect(400);
    }

    expect(prisma.funcion.findMany).not.toHaveBeenCalled();
    expect(prisma.orden.create).not.toHaveBeenCalled();
  });

  it('POST /ordenes rechaza funciones inexistentes o ya empezadas, butacas de otra sala y productos inactivos', async () => {
    prisma.butaca.findMany.mockResolvedValue([butaca(103)]);
    prisma.funcion.findMany.mockResolvedValueOnce([]);
    prisma.funcion.findMany.mockResolvedValueOnce([
      { ...funcion, iniciaEn: ayer },
    ]);
    prisma.funcion.findMany.mockResolvedValueOnce([{ ...funcion, salaId: 4 }]);
    prisma.producto.findMany.mockResolvedValueOnce([]);
    prisma.producto.findMany.mockResolvedValueOnce([
      { ...producto, activo: false },
    ]);

    const entradas = [{ funcionId: 10, butacaId: 103 }];
    const productos = [{ productoId: 1, cantidad: 1 }];

    await comprar({ entradas }).expect(400);
    await comprar({ entradas }).expect(400);
    await comprar({ entradas }).expect(400);
    await comprar({ productos }).expect(400);
    await comprar({ productos }).expect(400);

    expect(prisma.orden.create).not.toHaveBeenCalled();
  });

  it('POST /ordenes con una butaca inexistente responde 400', async () => {
    prisma.funcion.findMany.mockResolvedValue([funcion]);
    prisma.butaca.findMany.mockResolvedValue([]);

    await comprar({ entradas: [{ funcionId: 10, butacaId: 103 }] }).expect(400);
  });

  it('POST /ordenes con una butaca ya vendida responde 409', async () => {
    prisma.funcion.findMany.mockResolvedValue([funcion]);
    prisma.butaca.findMany.mockResolvedValue([butaca(103)]);
    prisma.orden.create.mockRejectedValue({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: { constraint: { index: 'entradas_funcion_butaca_key' } },
        },
      },
    });

    await comprar({ entradas: [{ funcionId: 10, butacaId: 103 }] }).expect(409);

    expect(prisma.orden.create).toHaveBeenCalledTimes(1);
  });

  it('POST /ordenes reintenta con otro número si el número ya existe', async () => {
    prisma.funcion.findMany.mockResolvedValue([funcion]);
    prisma.butaca.findMany.mockResolvedValue([butaca(103)]);
    prisma.orden.create.mockRejectedValueOnce({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: { constraint: { index: 'ordenes_numero_key' } },
        },
      },
    });
    prisma.orden.create.mockResolvedValueOnce(ordenEnBase());

    await comprar({ entradas: [{ funcionId: 10, butacaId: 103 }] }).expect(201);

    const [primero, segundo] = prisma.orden.create.mock.calls.map(
      (llamada) => llamada[0].data.numero,
    );

    expect(prisma.orden.create).toHaveBeenCalledTimes(2);
    expect(primero).not.toBe(segundo);
  });

  it('GET /ordenes devuelve a un cliente solo sus órdenes', async () => {
    prisma.orden.findMany.mockResolvedValue([ordenEnBase()]);

    const respuesta = await request(app.getHttpServer())
      .get('/ordenes?estado=pagada')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);

    expect(respuesta.body).toHaveLength(1);
    expect(prisma.orden.findMany.mock.calls[0][0].where).toEqual({
      usuarioId: 7,
      estado: 'pagada',
    });
  });

  it('GET /ordenes deja al administrador ver todas o filtrar por usuario, y a un cliente no ver las de otro', async () => {
    prisma.orden.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/ordenes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/ordenes?usuarioId=7')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/ordenes?usuarioId=7')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/ordenes?usuarioId=8')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/ordenes?estado=otra')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(400);

    expect(
      prisma.orden.findMany.mock.calls[0][0].where.usuarioId,
    ).toBeUndefined();
    expect(prisma.orden.findMany.mock.calls[1][0].where.usuarioId).toBe(7);
  });

  it('GET /ordenes/:id lo ve su dueño o un administrador, y otro cliente recibe 403', async () => {
    prisma.orden.findUnique.mockResolvedValue(ordenEnBase());

    await request(app.getHttpServer())
      .get('/ordenes/20')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/ordenes/20')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/ordenes/20')
      .set('Authorization', `Bearer ${tokenOtroCliente}`)
      .expect(403);
  });

  it('GET /ordenes/:id inexistente responde 404 y con texto 400', async () => {
    prisma.orden.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/ordenes/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/ordenes/abc')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(400);
  });

  it('PATCH /ordenes/:id/cancelar libera las butacas y deja la orden sin total', async () => {
    prisma.orden.findUnique.mockResolvedValue(ordenEnBase());
    prisma.orden.update.mockResolvedValue(
      ordenEnBase({ estado: 'cancelada', entradas: [], productos: [] }),
    );

    const respuesta = await request(app.getHttpServer())
      .patch('/ordenes/20/cancelar')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);

    expect(prisma.entrada.deleteMany).toHaveBeenCalledWith({
      where: { ordenId: 20 },
    });
    expect(prisma.ordenProducto.deleteMany).toHaveBeenCalledWith({
      where: { ordenId: 20 },
    });
    expect(prisma.orden.update.mock.calls[0][0].data).toEqual({
      estado: 'cancelada',
    });
    expect(respuesta.body).toMatchObject({
      estado: 'cancelada',
      total: 0,
      entradas: [],
    });
  });

  it('PATCH /ordenes/:id/cancelar responde 403, 404 o 409 según el caso', async () => {
    const yaEmpezada = ordenEnBase();
    yaEmpezada.entradas[0].funcion.iniciaEn = ayer;
    prisma.orden.findUnique.mockResolvedValueOnce(ordenEnBase());
    prisma.orden.findUnique.mockResolvedValueOnce(null);
    prisma.orden.findUnique.mockResolvedValueOnce(
      ordenEnBase({ estado: 'cancelada', entradas: [], productos: [] }),
    );
    prisma.orden.findUnique.mockResolvedValueOnce(yaEmpezada);

    await request(app.getHttpServer())
      .patch('/ordenes/20/cancelar')
      .set('Authorization', `Bearer ${tokenOtroCliente}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/ordenes/99/cancelar')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch('/ordenes/20/cancelar')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(409);
    await request(app.getHttpServer())
      .patch('/ordenes/20/cancelar')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(409);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('no existen rutas para modificar ni eliminar una orden', async () => {
    await request(app.getHttpServer())
      .patch('/ordenes/20')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .delete('/ordenes/20')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);
  });
});
