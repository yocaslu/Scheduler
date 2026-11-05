import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizarEmail } from '../../common/transformacoes';

export class LoginDto {
  @NormalizarEmail()
  @IsString()
  @IsNotEmpty({ message: 'Informe o e-mail ou login.' })
  @MaxLength(255)
  login!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  @MaxLength(200)
  senha!: string;
}
