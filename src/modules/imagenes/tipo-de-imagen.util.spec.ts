import { detectarTipoDeImagen } from './tipo-de-imagen.util.js';

describe('detectarTipoDeImagen', () => {
  it('reconoce JPG, PNG y WebP por el comienzo del archivo', () => {
    expect(detectarTipoDeImagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'jpg',
    );
    expect(
      detectarTipoDeImagen(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      ),
    ).toBe('png');
    expect(
      detectarTipoDeImagen(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')),
    ).toBe('webp');
  });

  it('rechaza GIF, SVG, texto y archivos vacíos o demasiado cortos', () => {
    expect(detectarTipoDeImagen(Buffer.from('GIF89a'))).toBeUndefined();
    expect(
      detectarTipoDeImagen(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      ),
    ).toBeUndefined();
    expect(detectarTipoDeImagen(Buffer.from('hola'))).toBeUndefined();
    expect(detectarTipoDeImagen(Buffer.alloc(0))).toBeUndefined();
    expect(detectarTipoDeImagen(Buffer.from([0xff, 0xd8]))).toBeUndefined();
  });

  it('no acepta un RIFF que no es WebP', () => {
    expect(
      detectarTipoDeImagen(Buffer.from('RIFF\u0000\u0000\u0000\u0000WAVEfmt ')),
    ).toBeUndefined();
  });
});
