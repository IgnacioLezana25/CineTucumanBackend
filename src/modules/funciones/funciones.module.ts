import { Module } from '@nestjs/common';
import { FuncionesService } from './funciones.service.js';
import { FuncionesController } from './funciones.controller.js';

@Module({
  controllers: [FuncionesController],
  providers: [FuncionesService],
})
export class FuncionesModule {}
