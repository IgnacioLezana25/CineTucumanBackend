export type ExtensionDeImagen = 'jpg' | 'png' | 'webp';

const FIRMA_JPG = [0xff, 0xd8, 0xff];
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const FIRMA_RIFF = [0x52, 0x49, 0x46, 0x46];
const FIRMA_WEBP = [0x57, 0x45, 0x42, 0x50];

function empiezaCon(datos: Buffer, firma: number[], desde = 0): boolean {
  return firma.every((byte, indice) => datos[desde + indice] === byte);
}

export function detectarTipoDeImagen(
  datos: Buffer,
): ExtensionDeImagen | undefined {
  if (empiezaCon(datos, FIRMA_JPG)) {
    return 'jpg';
  }

  if (empiezaCon(datos, FIRMA_PNG)) {
    return 'png';
  }

  if (empiezaCon(datos, FIRMA_RIFF) && empiezaCon(datos, FIRMA_WEBP, 8)) {
    return 'webp';
  }

  return undefined;
}
