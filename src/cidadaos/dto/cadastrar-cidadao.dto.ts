import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Aparar, NormalizarEmail, VazioParaUndefined } from '../../common/transformacoes';

export class CadastrarCidadaoDto {
  @Aparar()
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  @MaxLength(150)
  nome!: string;

  @NormalizarEmail()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(200)
  senha!: string;

  @VazioParaUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @VazioParaUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cep?: string;

  @VazioParaUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endereco?: string;
}
