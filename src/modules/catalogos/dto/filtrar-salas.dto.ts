import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class FiltrarSalasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sucursalId?: number;
}
