import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

export class CreatePeliculaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tituloOriginal?: string;

  @IsOptional()
  @IsString()
  sinopsis?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(32767)
  duracionMinutos?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  clasificacionId?: number;

  @IsIn(['en-cartelera', 'proximamente'])
  estado: string;

  @IsOptional()
  @IsBoolean()
  destacada?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaEstreno debe tener el formato AAAA-MM-DD',
  })
  fechaEstreno?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  posterArchivo: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  trailerYoutube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  director?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  paisOrigen?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  generoIds?: number[];
}
