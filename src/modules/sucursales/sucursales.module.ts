import { Module } from '@nestjs/common';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { SucursalesService } from './sucursales.service.js';
import { SucursalesController } from './sucursales.controller.js';

@Module({
  imports: [ImagenesModule],
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class SucursalesModule {}
