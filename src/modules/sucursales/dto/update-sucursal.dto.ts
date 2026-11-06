import { PartialType } from '@nestjs/mapped-types';
import { CreateSucursalDto } from './create-sucursal.dto.js';

export class UpdateSucursalDto extends PartialType(CreateSucursalDto) {}
