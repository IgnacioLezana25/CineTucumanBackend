import { IsOptional, Matches } from 'class-validator';

export class FiltrarSalasDto {
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'sucursalId debe ser un número entero positivo',
  })
  sucursalId?: string;
}
