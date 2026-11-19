import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module.js';
import { PeliculasService } from './peliculas.service.js';
import { PeliculasController } from './peliculas.controller.js';

@Module({
  imports: [TokenModule],
  controllers: [PeliculasController],
  providers: [PeliculasService],
})
export class PeliculasModule {}
