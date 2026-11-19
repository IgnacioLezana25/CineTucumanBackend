import { compare, hash } from 'bcrypt';

const RONDAS_DE_CIFRADO = 10;

export function cifrarContrasena(contrasena: string): Promise<string> {
  return hash(contrasena, RONDAS_DE_CIFRADO);
}

export function contrasenaCoincide(
  contrasena: string,
  contrasenaHash: string,
): Promise<boolean> {
  return compare(contrasena, contrasenaHash);
}

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}
