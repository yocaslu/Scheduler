import { IsString, MaxLength, MinLength } from 'class-validator';

export class AlterarSenhaDto {
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(200)
  senha!: string;
}
