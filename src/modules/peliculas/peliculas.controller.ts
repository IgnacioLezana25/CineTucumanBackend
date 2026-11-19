import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SoloAdministrador } from '../auth/decorators/solo-administrador.decorator.js';
import { PeliculasService } from './peliculas.service.js';
import { CreatePeliculaDto } from './dto/create-pelicula.dto.js';
import { FiltrarPeliculasDto } from './dto/filtrar-peliculas.dto.js';
import { UpdatePeliculaDto } from './dto/update-pelicula.dto.js';

@Controller('peliculas')
export class PeliculasController {
  constructor(private readonly peliculasService: PeliculasService) {}

  @Post()
  @SoloAdministrador()
  create(@Body() createPeliculaDto: CreatePeliculaDto) {
    return this.peliculasService.create(createPeliculaDto);
  }

  @Get()
  findAll(@Query() filtros: FiltrarPeliculasDto) {
    return this.peliculasService.findAll(filtros);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.peliculasService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.peliculasService.findOne(id);
  }

  @Patch(':id')
  @SoloAdministrador()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePeliculaDto: UpdatePeliculaDto,
  ) {
    return this.peliculasService.update(id, updatePeliculaDto);
  }

  @Delete(':id')
  @SoloAdministrador()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.peliculasService.remove(id);
  }
}
