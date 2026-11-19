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
import { FuncionesService } from './funciones.service.js';
import { CreateFuncionDto } from './dto/create-funcion.dto.js';
import { FiltrarFuncionesDto } from './dto/filtrar-funciones.dto.js';
import { UpdateFuncionDto } from './dto/update-funcion.dto.js';

@Controller('funciones')
export class FuncionesController {
  constructor(private readonly funcionesService: FuncionesService) {}

  @Post()
  @SoloAdministrador()
  create(@Body() createFuncionDto: CreateFuncionDto) {
    return this.funcionesService.create(createFuncionDto);
  }

  @Get()
  findAll(@Query() filtros: FiltrarFuncionesDto) {
    return this.funcionesService.findAll(filtros);
  }

  @Get(':id/butacas')
  findButacas(@Param('id', ParseIntPipe) id: number) {
    return this.funcionesService.findButacas(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.funcionesService.findOne(id);
  }

  @Patch(':id')
  @SoloAdministrador()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFuncionDto: UpdateFuncionDto,
  ) {
    return this.funcionesService.update(id, updateFuncionDto);
  }

  @Delete(':id')
  @SoloAdministrador()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.funcionesService.remove(id);
  }
}
