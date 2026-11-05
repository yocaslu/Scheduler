import { PartialType } from '@nestjs/mapped-types';
import {
  agendamentos_atendimento,
  agendamentos_status,
  agendamentos_tipo_atendimento,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { HORARIOS } from '../../common/horarios';
import { Aparar, VazioParaUndefined } from '../../common/transformacoes';

export class ParticipanteDto {
  @Aparar()
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome de todos os participantes.' })
  @MaxLength(150)
  nome!: string;

  @VazioParaUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;
}

/** Agendamento criado pela equipe no painel (único ou em grupo). */
export class CriarAgendamentoAdminDto {
  @Aparar()
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  @MaxLength(150)
  nome!: string;

  // Aparar (e não VazioParaUndefined) para que "" possa apagar o valor na edição.
  @Aparar()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @VazioParaUndefined()
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(255)
  email?: string;

  @Aparar()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endereco?: string;

  @Aparar()
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo.' })
  @MaxLength(2000)
  motivo!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'A data deve estar no formato AAAA-MM-DD.' })
  data!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'O horário deve estar no formato HH:MM.' })
  horario!: string;

  @IsOptional()
  @IsEnum(agendamentos_atendimento, { message: 'Tipo de atendimento inválido.' })
  atendimento?: agendamentos_atendimento;

  @IsOptional()
  @IsEnum(agendamentos_status, { message: 'Status inválido.' })
  status?: agendamentos_status;

  @IsOptional()
  @IsEnum(agendamentos_tipo_atendimento, { message: 'Tipo de agendamento inválido.' })
  tipo_atendimento?: agendamentos_tipo_atendimento;

  @Aparar()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  tratativa?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ParticipanteDto)
  participantes?: ParticipanteDto[];

  @IsOptional()
  @IsArray()
  @IsIn(HORARIOS, { each: true, message: 'Bloco de horário fora do expediente.' })
  blocos?: string[];
}

export class AtualizarAgendamentoAdminDto extends PartialType(CriarAgendamentoAdminDto) {}

export class FiltroAgendamentosDto {
  @VazioParaUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  busca?: string;

  @VazioParaUndefined()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'A data deve estar no formato AAAA-MM-DD.' })
  data?: string;

  @VazioParaUndefined()
  @IsOptional()
  @IsEnum(agendamentos_status, { message: 'Status inválido.' })
  status?: agendamentos_status;

  @VazioParaUndefined()
  @IsOptional()
  @IsEnum(agendamentos_atendimento, { message: 'Tipo de atendimento inválido.' })
  atendimento?: agendamentos_atendimento;
}
