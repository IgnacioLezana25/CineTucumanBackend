import {
  cifrarContrasena,
  contrasenaCoincide,
  normalizarCorreo,
} from './contrasena.util.js';

describe('contraseñas y correos', () => {
  it('cifra con bcrypt y la contraseña original coincide', async () => {
    const cifrada = await cifrarContrasena('Prueba123!');

    expect(cifrada).toMatch(/^\$2[aby]\$10\$/);
    expect(cifrada).not.toContain('Prueba123!');
    expect(await contrasenaCoincide('Prueba123!', cifrada)).toBe(true);
    expect(await contrasenaCoincide('otra-contrasena', cifrada)).toBe(false);
  });

  it('dos cifrados de la misma contraseña son distintos', async () => {
    const primero = await cifrarContrasena('Prueba123!');
    const segundo = await cifrarContrasena('Prueba123!');

    expect(primero).not.toBe(segundo);
  });

  it('el correo se guarda en minúsculas y sin espacios', () => {
    expect(normalizarCorreo('  Ana.Perez@Test.COM ')).toBe(
      'ana.perez@test.com',
    );
  });
});
