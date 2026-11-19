import { IsInt, IsPositive } from 'class-validator';

export class EntradaOrdenDto {
  @IsInt()
  @IsPositive()
  funcionId: number;

  @IsInt()
  @IsPositive()
  butacaId: number;
}
