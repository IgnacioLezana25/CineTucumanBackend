import { Controller, Get, Query } from '@nestjs/common';
import { CatalogosService } from './catalogos.service.js';
import { FiltrarSalasDto } from './dto/filtrar-salas.dto.js';

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('generos')
  generos() {
    return this.catalogosService.generos();
  }

  @Get('clasificaciones')
  clasificaciones() {
    return this.catalogosService.clasificaciones();
  }

  @Get('ciudades')
  ciudades() {
    return this.catalogosService.ciudades();
  }

  @Get('salas')
  salas(@Query() filtros: FiltrarSalasDto) {
    return this.catalogosService.salas(filtros);
  }
}
