import { IsIn, IsOptional } from 'class-validator';

export class FiltrarProductosDto {
  @IsOptional()
  @IsIn(['combo', 'snack', 'bebida'])
  categoria?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  activo?: string;
}
