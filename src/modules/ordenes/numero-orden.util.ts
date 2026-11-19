import { randomBytes } from 'node:crypto';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO = 8;

export function generarNumeroDeOrden(): string {
  const bytes = randomBytes(LARGO);
  let sufijo = '';

  for (const byte of bytes) {
    sufijo += ALFABETO[byte % ALFABETO.length];
  }

  return `CT-${sufijo}`;
}
