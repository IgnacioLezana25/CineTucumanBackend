import { Controller, Get } from '@nestjs/common';
import { CatalogosService } from './catalogos.service.js';

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
}
