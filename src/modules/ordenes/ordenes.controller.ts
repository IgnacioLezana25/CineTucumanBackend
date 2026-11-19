import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateOrdenDto } from './dto/create-orden.dto.js';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto.js';
import { Orden } from './entities/orden.entity.js';
import { OrdenesService } from './ordenes.service.js';

@Controller('ordenes')
@UseGuards(JwtAuthGuard)
export class OrdenesController {
  constructor(private readonly ordenesService: OrdenesService) {}

  @Post()
  create(
    @Body() createOrdenDto: CreateOrdenDto,
    @UsuarioActual() comprador: UsuarioAutenticado,
  ): Promise<Orden> {
    return this.ordenesService.create(createOrdenDto, comprador);
  }

  @Get()
  findAll(
    @UsuarioActual() solicitante: UsuarioAutenticado,
    @Query() filtros: FiltrarOrdenesDto,
  ): Promise<Orden[]> {
    return this.ordenesService.findAll(solicitante, filtros);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() solicitante: UsuarioAutenticado,
  ): Promise<Orden> {
    return this.ordenesService.findOne(id, solicitante);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() solicitante: UsuarioAutenticado,
  ): Promise<Orden> {
    return this.ordenesService.cancelar(id, solicitante);
  }
}
