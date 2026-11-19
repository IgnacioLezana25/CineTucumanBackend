import { generarNumeroDeOrden } from './numero-orden.util.js';

describe('generarNumeroDeOrden', () => {
  it('empieza con CT- y tiene 8 caracteres sin letras ni números ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      expect(generarNumeroDeOrden()).toMatch(/^CT-[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it('no repite números', () => {
    const numeros = new Set(
      Array.from({ length: 1000 }, () => generarNumeroDeOrden()),
    );

    expect(numeros.size).toBe(1000);
  });
});
