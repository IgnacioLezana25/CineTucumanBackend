import { Module } from '@nestjs/common';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { PeliculasService } from './peliculas.service.js';
import { PeliculasController } from './peliculas.controller.js';

@Module({
  imports: [ImagenesModule],
  controllers: [PeliculasController],
  providers: [PeliculasService],
})
export class PeliculasModule {}
