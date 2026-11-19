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
import { ProductosService } from './productos.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { FiltrarProductosDto } from './dto/filtrar-productos.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  findAll(@Query() filtros: FiltrarProductosDto) {
    return this.productosService.findAll(filtros);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productosService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.remove(id);
  }
}
