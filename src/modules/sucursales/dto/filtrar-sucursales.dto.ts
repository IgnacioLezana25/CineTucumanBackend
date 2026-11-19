import { IsIn, IsOptional } from 'class-validator';

export class FiltrarSucursalesDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  destacada?: string;
}
