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
import { SucursalesService } from './sucursales.service.js';
import { CreateSucursalDto } from './dto/create-sucursal.dto.js';
import { FiltrarSucursalesDto } from './dto/filtrar-sucursales.dto.js';
import { UpdateSucursalDto } from './dto/update-sucursal.dto.js';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  @SoloAdministrador()
  create(@Body() createSucursalDto: CreateSucursalDto) {
    return this.sucursalesService.create(createSucursalDto);
  }

  @Get()
  findAll(@Query() filtros: FiltrarSucursalesDto) {
    return this.sucursalesService.findAll(filtros);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.sucursalesService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.findOne(id);
  }

  @Patch(':id')
  @SoloAdministrador()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSucursalDto: UpdateSucursalDto,
  ) {
    return this.sucursalesService.update(id, updateSucursalDto);
  }

  @Delete(':id')
  @SoloAdministrador()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.remove(id);
  }
}
