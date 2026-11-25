import { Prisma } from '../src/generated/prisma/client.js';

export function errorDePrisma(codigo: string) {
  return new Prisma.PrismaClientKnownRequestError(`Error ${codigo}`, {
    code: codigo,
    clientVersion: 'pruebas',
  });
}
