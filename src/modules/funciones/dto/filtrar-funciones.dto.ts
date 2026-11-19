import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';

export class FiltrarFuncionesDto {
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'peliculaId debe ser un número entero positivo',
  })
  peliculaId?: string;

  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'sucursalId debe ser un número entero positivo',
  })
  sucursalId?: string;

  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'salaId debe ser un número entero positivo',
  })
  salaId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener el formato AAAA-MM-DD',
  })
  fecha?: string;

  @IsOptional()
  @IsIn(['2D', '3D'])
  formato?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  proximas?: string;
}
