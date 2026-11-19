import { IsIn, IsOptional, Matches } from 'class-validator';

export class FiltrarOrdenesDto {
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'usuarioId debe ser un número entero positivo',
  })
  usuarioId?: string;

  @IsOptional()
  @IsIn(['pendiente', 'pagada', 'cancelada'])
  estado?: string;
}
