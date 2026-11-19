import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ArchivoSubido } from '../imagenes/archivo-subido.types.js';
import { OPCIONES_DE_SUBIDA } from '../imagenes/opciones-de-subida.js';
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

  @Post(':id/poster')
  @SoloAdministrador()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo', OPCIONES_DE_SUBIDA))
  subirPoster(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    return this.peliculasService.subirPoster(id, archivo);
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
