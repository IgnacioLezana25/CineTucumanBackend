import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module.js';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { SucursalesService } from './sucursales.service.js';
import { SucursalesController } from './sucursales.controller.js';

@Module({
  imports: [TokenModule, ImagenesModule],
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class SucursalesModule {}
