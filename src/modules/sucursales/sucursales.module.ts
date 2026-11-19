import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module.js';
import { SucursalesService } from './sucursales.service.js';
import { SucursalesController } from './sucursales.controller.js';

@Module({
  imports: [TokenModule],
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class SucursalesModule {}
