import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { HORARIOS } from '../../common/horarios';
import { Aparar } from '../../common/transformacoes';

/** Pedido feito pelo cidadão logado. Nome, e-mail e telefone vêm do cadastro dele. */
export class CriarAgendamentoDto {
  @Aparar()
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo do atendimento.' })
  @MaxLength(2000)
  motivo!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'A data deve estar no formato AAAA-MM-DD.' })
  data!: string;

  @IsIn(HORARIOS, { message: 'Horário fora do expediente.' })
  horario!: string;
}
