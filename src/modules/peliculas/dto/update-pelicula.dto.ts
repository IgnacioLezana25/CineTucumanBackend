import { PartialType } from '@nestjs/mapped-types';
import { CreatePeliculaDto } from './create-pelicula.dto.js';

export class UpdatePeliculaDto extends PartialType(CreatePeliculaDto) {}
