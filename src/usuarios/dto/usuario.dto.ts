import { usuarios_admin_papel } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Aparar, NormalizarEmail, VazioParaUndefined } from '../../common/transformacoes';

export class CriarUsuarioDto {
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

  @IsOptional()
  @IsEnum(usuarios_admin_papel, { message: 'Perfil inválido.' })
  papel?: usuarios_admin_papel;
}

export class AtualizarUsuarioDto {
  @Aparar()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  @MaxLength(150)
  nome?: string;

  // O formulário envia o e-mail, mas ele não pode ser alterado; o valor é ignorado.
  @IsOptional()
  @IsString()
  email?: string;

  // Senha em branco na edição significa "manter a atual".
  @VazioParaUndefined()
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(200)
  senha?: string;

  @IsOptional()
  @IsEnum(usuarios_admin_papel, { message: 'Perfil inválido.' })
  papel?: usuarios_admin_papel;
}
