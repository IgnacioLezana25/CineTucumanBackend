import { PartialType } from '@nestjs/mapped-types';
import { CreateFuncionDto } from './create-funcion.dto.js';

export class UpdateFuncionDto extends PartialType(CreateFuncionDto) {}
