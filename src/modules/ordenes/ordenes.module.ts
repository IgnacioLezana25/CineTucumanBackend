import { Module } from '@nestjs/common';
import { OrdenesService } from './ordenes.service.js';
import { OrdenesController } from './ordenes.controller.js';

@Module({
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
