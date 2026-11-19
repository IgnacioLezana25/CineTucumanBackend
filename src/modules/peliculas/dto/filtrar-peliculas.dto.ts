import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class FiltrarPeliculasDto {
  @IsOptional()
  @IsIn(['en-cartelera', 'proximamente'])
  estado?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  destacada?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  q?: string;
}
