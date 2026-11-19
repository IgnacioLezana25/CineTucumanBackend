import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configuracion: ConfigService) {
    const connectionString = configuracion.getOrThrow<string>('DATABASE_URL');

    try {
      new URL(connectionString);
    } catch {
      throw new Error(
        'DATABASE_URL no es una URL válida. Si la contraseña tiene símbolos como #, / o ?, hay que escribirlos codificados (por ejemplo, # como %23).',
      );
    }

    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
