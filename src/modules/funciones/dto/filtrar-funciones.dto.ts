import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  Matches,
} from 'class-validator';

export class FiltrarFuncionesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  peliculaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sucursalId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  salaId?: number;

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
