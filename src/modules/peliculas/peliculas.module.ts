import { Module } from '@nestjs/common';
import { PeliculasService } from './peliculas.service.js';
import { PeliculasController } from './peliculas.controller.js';

@Module({
  controllers: [PeliculasController],
  providers: [PeliculasService],
})
export class PeliculasModule {}
