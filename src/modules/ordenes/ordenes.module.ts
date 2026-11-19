import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module.js';
import { OrdenesController } from './ordenes.controller.js';
import { OrdenesService } from './ordenes.service.js';

@Module({
  imports: [TokenModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
