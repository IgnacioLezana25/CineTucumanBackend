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

  @Post(':id/imagen')
  @SoloAdministrador()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo', OPCIONES_DE_SUBIDA))
  subirImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    return this.sucursalesService.subirImagen(id, archivo);
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
