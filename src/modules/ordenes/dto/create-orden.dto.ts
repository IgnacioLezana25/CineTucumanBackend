import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { EntradaOrdenDto } from './entrada-orden.dto.js';
import { ProductoOrdenDto } from './producto-orden.dto.js';

export class CreateOrdenDto {
  @IsInt()
  @IsPositive()
  usuarioId: number;

  @IsOptional()
  @IsIn(['pendiente', 'pagada', 'cancelada'])
  estado?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(6)
  @ArrayUnique(
    (entrada: EntradaOrdenDto) => `${entrada.funcionId}-${entrada.butacaId}`,
  )
  @ValidateNested({ each: true })
  @Type(() => EntradaOrdenDto)
  entradas?: EntradaOrdenDto[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((producto: ProductoOrdenDto) => producto.productoId)
  @ValidateNested({ each: true })
  @Type(() => ProductoOrdenDto)
  productos?: ProductoOrdenDto[];
}
