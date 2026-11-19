import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ActorPeliculaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fotoArchivo?: string;
}
