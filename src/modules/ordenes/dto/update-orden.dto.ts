import { PartialType } from '@nestjs/mapped-types';
import { CreateOrdenDto } from './create-orden.dto.js';

export class UpdateOrdenDto extends PartialType(CreateOrdenDto) {}
