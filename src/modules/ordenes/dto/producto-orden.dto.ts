import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class ProductoOrdenDto {
  @IsInt()
  @IsPositive()
  productoId: number;

  @IsInt()
  @Min(1)
  @Max(10)
  cantidad: number;
}
