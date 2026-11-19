import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module.js';
import { ProductosService } from './productos.service.js';
import { ProductosController } from './productos.controller.js';

@Module({
  imports: [TokenModule],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
