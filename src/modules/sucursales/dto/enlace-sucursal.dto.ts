import { IsIn, IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class EnlaceSucursalDto {
  @IsIn(['sitio', 'instagram', 'facebook'])
  tipo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;
}
