import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateFuncionDto {
  @IsInt()
  @IsPositive()
  peliculaId: number;

  @IsInt()
  @IsPositive()
  salaId: number;

  @IsISO8601({ strict: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    {
      message:
        'iniciaEn debe incluir fecha, hora y zona horaria, por ejemplo 2026-11-13T19:20:00-03:00',
    },
  )
  iniciaEn: string;

  @IsIn(['2D', '3D'])
  formato: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  idioma?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999.99)
  precio: number;
}
