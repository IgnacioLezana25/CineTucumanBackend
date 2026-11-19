import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  apellido: string;

  @IsEmail()
  @MaxLength(120)
  correo: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena: string;
}
