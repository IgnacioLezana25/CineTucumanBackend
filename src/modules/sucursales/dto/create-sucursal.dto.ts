import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EnlaceSucursalDto } from './enlace-sucursal.dto.js';

export class CreateSucursalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsInt()
  @IsPositive()
  ciudadId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  direccion: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  imagenArchivo?: string;

  @IsOptional()
  @IsBoolean()
  destacada?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique((enlace: EnlaceSucursalDto) => enlace.tipo)
  @ValidateNested({ each: true })
  @Type(() => EnlaceSucursalDto)
  enlaces?: EnlaceSucursalDto[];
}
