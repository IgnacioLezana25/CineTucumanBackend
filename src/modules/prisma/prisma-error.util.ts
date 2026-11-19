export const PRISMA_CLAVE_UNICA = 'P2002';
export const PRISMA_CLAVE_FORANEA = 'P2003';
export const PRISMA_NO_ENCONTRADO = 'P2025';

export function codigoDeError(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String(error.code);
  }

  return undefined;
}
