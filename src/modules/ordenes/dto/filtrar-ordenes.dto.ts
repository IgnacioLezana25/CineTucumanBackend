import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';

export class FiltrarOrdenesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usuarioId?: number;

  @IsOptional()
  @IsIn(['pendiente', 'pagada', 'cancelada'])
  estado?: string;
}
