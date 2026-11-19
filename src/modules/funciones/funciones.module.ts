import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module.js';
import { FuncionesService } from './funciones.service.js';
import { FuncionesController } from './funciones.controller.js';

@Module({
  imports: [TokenModule],
  controllers: [FuncionesController],
  providers: [FuncionesService],
})
export class FuncionesModule {}
