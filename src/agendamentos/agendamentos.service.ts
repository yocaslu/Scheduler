import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { agendamentos, agendamentos_tipo_atendimento, Prisma } from '@prisma/client';
import {
  dataValida,
  diaUtil,
  formatarData,
  formatarHorario,
  hoje,
  paraData,
  paraHorario,
} from '../common/datas';
import {
  blocosValidos,
  HORARIOS,
  normalizarParticipantes,
  ParticipanteInput,
} from '../common/horarios';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import {
  AtualizarAgendamentoAdminDto,
  CriarAgendamentoAdminDto,
  FiltroAgendamentosDto,
} from './dto/agendamento-admin.dto';

type AgendamentoComContagem = agendamentos & {
  _count?: { agendamento_participantes: number };
};

/** Formata datas e horários do banco para o que o frontend exibe. */
export function formatarAgendamento(a: AgendamentoComContagem) {
  const { _count, ...resto } = a;
  const data = formatarData(a.data);
  return {
    ...resto,
    data,
    data_br: data.split('-').reverse().join('/'),
    horario: formatarHorario(a.horario),
    participantes_total: _count?.agendamento_participantes,
  };
}

/** Violação do @@unique([data, horario_inicio]) de agendamento_slots vira 409. */
function traduzirConflito(e: unknown): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('Um dos horários escolhidos já está ocupado.');
  }
  return e;
}

function blocosDoJson(valor: Prisma.JsonValue): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

interface DadosReserva {
  tipo_atendimento: agendamentos_tipo_atendimento;
  horario: string;
  blocos?: string[];
  participantes?: ParticipanteInput[];
  nome: string;
  telefone?: string | null;
}

@Injectable()
export class AgendamentosService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Disponibilidade ----------

  async horariosOcupados(dataISO: string): Promise<string[]> {
    if (!dataValida(dataISO)) throw new BadRequestException('Data inválida.');
    const slots = await this.prisma.agendamento_slots.findMany({
      where: { data: paraData(dataISO) },
      select: { horario_inicio: true },
    });
    return slots.map((s) => formatarHorario(s.horario_inicio));
  }

  async horariosDisponiveis(dataISO: string) {
    if (!dataValida(dataISO)) throw new BadRequestException('Data inválida.');
    if (!diaUtil(dataISO) || dataISO < hoje()) {
      return { horariosOcupados: [], horariosDisponiveis: [] };
    }
    const horariosOcupados = await this.horariosOcupados(dataISO);
    const horariosDisponiveis = HORARIOS.filter((h) => !horariosOcupados.includes(h));
    return { horariosOcupados, horariosDisponiveis };
  }

  // ---------- Cidadão ----------

  async criarParaCidadao(dto: CriarAgendamentoDto, cidadaoId: number) {
    if (!dataValida(dto.data)) throw new BadRequestException('Data inválida.');
    if (dto.data < hoje()) throw new BadRequestException('Não é possível agendar em data passada.');
    if (!diaUtil(dto.data)) throw new BadRequestException('Atendimento apenas em dias úteis.');

    const cidadao = await this.prisma.cidadaos.findUnique({
      where: { id: cidadaoId },
      select: { nome: true, email: true, telefone: true, cep: true, endereco: true },
    });
    if (!cidadao) throw new UnauthorizedException('Cadastro não encontrado. Faça login novamente.');

    const data = paraData(dto.data);
    const horario = paraHorario(dto.data, dto.horario);

    try {
      // Create aninhado: agendamento, slot e participante são gravados numa única transação.
      const novo = await this.prisma.agendamentos.create({
        data: {
          ...cidadao,
          motivo: dto.motivo,
          data,
          horario,
          status: 'pedido_pendente',
          atendimento: 'marcado',
          tipo_atendimento: 'unico',
          blocos_json: [dto.horario],
          cidadaos: { connect: { id: cidadaoId } },
          agendamento_slots: { create: [{ data, horario_inicio: horario }] },
          agendamento_participantes: {
            create: [{ nome: cidadao.nome, telefone: cidadao.telefone, principal: true }],
          },
        },
      });
      return { sucesso: true, id: novo.id, mensagem: 'Pedido registrado com sucesso.' };
    } catch (e) {
      throw traduzirConflito(e);
    }
  }

  async listarDoCidadao(cidadaoId: number) {
    const lista = await this.prisma.agendamentos.findMany({
      where: { cidadao_id: cidadaoId },
      orderBy: [{ data: 'desc' }, { horario: 'asc' }],
    });
    return lista.map(formatarAgendamento);
  }

  async cancelarPeloCidadao(id: number, cidadaoId: number) {
    return this.prisma.$transaction(async (tx) => {
      const agendamento = await tx.agendamentos.findFirst({
        where: { id, cidadao_id: cidadaoId, status: 'pedido_pendente' },
      });
      if (!agendamento) {
        throw new NotFoundException('Agendamento não encontrado ou não pode mais ser cancelado.');
      }

      await tx.agendamentos.update({ where: { id }, data: { status: 'cancelado' } });
      await tx.agendamento_slots.deleteMany({ where: { agendamento_id: id } });

      return { sucesso: true, mensagem: 'Agendamento cancelado com sucesso.' };
    });
  }

  // ---------- Painel ----------

  async listar(filtro: FiltroAgendamentosDto) {
    const where: Prisma.agendamentosWhereInput = {};

    if (filtro.data) {
      if (!dataValida(filtro.data)) throw new BadRequestException('Data inválida.');
      where.data = paraData(filtro.data);
    }
    if (filtro.status) where.status = filtro.status;
    if (filtro.atendimento) where.atendimento = filtro.atendimento;
    if (filtro.busca) {
      const contains = filtro.busca;
      where.OR = [
        { nome: { contains } },
        { email: { contains } },
        { telefone: { contains } },
        { endereco: { contains } },
        { motivo: { contains } },
        { tratativa: { contains } },
      ];
    }

    const lista = await this.prisma.agendamentos.findMany({
      where,
      orderBy: [{ data: 'desc' }, { horario: 'asc' }],
      include: { _count: { select: { agendamento_participantes: true } } },
      take: 500,
    });
    return { agendamentos: lista.map(formatarAgendamento) };
  }

  async pendencias() {
    const lista = await this.prisma.agendamentos.findMany({
      where: { status: 'pedido_pendente' },
      orderBy: [{ data: 'asc' }, { horario: 'asc' }],
    });
    return { agendamentos: lista.map(formatarAgendamento) };
  }

  async detalhes(id: number) {
    const agendamento = await this.prisma.agendamentos.findUnique({
      where: { id },
      include: {
        agendamento_participantes: {
          orderBy: [{ principal: 'desc' }, { id: 'asc' }],
          select: { nome: true, telefone: true },
        },
        agendamento_slots: { orderBy: { horario_inicio: 'asc' }, select: { horario_inicio: true } },
      },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');

    const blocos = agendamento.agendamento_slots.length
      ? agendamento.agendamento_slots.map((s) => formatarHorario(s.horario_inicio))
      : blocosDoJson(agendamento.blocos_json);
    return { participantes: agendamento.agendamento_participantes, blocos };
  }

  async criarPeloPainel(dto: CriarAgendamentoAdminDto) {
    if (!dataValida(dto.data)) throw new BadRequestException('Data inválida.');

    const tipo = dto.tipo_atendimento ?? 'unico';
    const status = dto.status ?? 'pedido_pendente';
    const reserva = this.montarReserva({ ...dto, tipo_atendimento: tipo });
    const data = paraData(dto.data);

    try {
      const novo = await this.prisma.agendamentos.create({
        data: {
          nome: reserva.nome,
          telefone: reserva.telefone,
          email: dto.email ?? null,
          endereco: dto.endereco || null,
          motivo: dto.motivo,
          tratativa: dto.tratativa || null,
          status,
          atendimento: dto.atendimento ?? 'no_paco',
          tipo_atendimento: tipo,
          data,
          horario: paraHorario(dto.data, reserva.blocos[0]),
          blocos_json: reserva.blocos,
          agendamento_slots: this.slotsParaCriar(status, dto.data, reserva.blocos),
          agendamento_participantes: { create: reserva.participantes },
        },
      });
      return { sucesso: true, id: novo.id, mensagem: 'Agendamento registrado com sucesso.' };
    } catch (e) {
      throw traduzirConflito(e);
    }
  }

  async atualizarPeloPainel(id: number, dto: AtualizarAgendamentoAdminDto) {
    const atual = await this.prisma.agendamentos.findUnique({
      where: { id },
      include: {
        agendamento_participantes: { orderBy: [{ principal: 'desc' }, { id: 'asc' }] },
        agendamento_slots: { orderBy: { horario_inicio: 'asc' } },
      },
    });
    if (!atual) throw new NotFoundException(`Agendamento ${id} não encontrado.`);

    const dataISO = dto.data ?? formatarData(atual.data);
    if (!dataValida(dataISO)) throw new BadRequestException('Data inválida.');

    const tipo = dto.tipo_atendimento ?? atual.tipo_atendimento;
    const status = dto.status ?? atual.status;
    const blocosAtuais = atual.agendamento_slots.length
      ? atual.agendamento_slots.map((s) => formatarHorario(s.horario_inicio))
      : blocosDoJson(atual.blocos_json);

    const reserva = this.montarReserva({
      tipo_atendimento: tipo,
      horario: dto.horario ?? formatarHorario(atual.horario),
      blocos: dto.blocos ?? blocosAtuais,
      participantes:
        dto.participantes ??
        atual.agendamento_participantes.map((p) => ({
          nome: p.nome,
          telefone: p.telefone ?? undefined,
        })),
      nome: dto.nome ?? atual.nome,
      telefone: dto.telefone ?? atual.telefone,
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Slots e participantes são recriados a partir do estado final.
        // Cancelar libera os horários; trocar data ou horário reserva os novos.
        await tx.agendamento_slots.deleteMany({ where: { agendamento_id: id } });
        await tx.agendamento_participantes.deleteMany({ where: { agendamento_id: id } });

        const atualizado = await tx.agendamentos.update({
          where: { id },
          data: {
            nome: reserva.nome,
            telefone: reserva.telefone,
            email: dto.email,
            endereco: dto.endereco === undefined ? undefined : dto.endereco || null,
            motivo: dto.motivo,
            tratativa: dto.tratativa === undefined ? undefined : dto.tratativa || null,
            status,
            atendimento: dto.atendimento,
            tipo_atendimento: tipo,
            data: paraData(dataISO),
            horario: paraHorario(dataISO, reserva.blocos[0]),
            blocos_json: reserva.blocos,
            agendamento_slots: this.slotsParaCriar(status, dataISO, reserva.blocos),
            agendamento_participantes: { create: reserva.participantes },
          },
        });

        return {
          sucesso: true,
          mensagem: 'Atendimento atualizado com sucesso.',
          agendamento: formatarAgendamento(atualizado),
        };
      });
    } catch (e) {
      throw traduzirConflito(e);
    }
  }

  async excluir(id: number) {
    const agendamento = await this.prisma.agendamentos.findUnique({ where: { id } });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');

    // Slots e participantes são removidos em cascata (onDelete: Cascade).
    await this.prisma.agendamentos.delete({ where: { id } });
    return { sucesso: true, mensagem: 'Agendamento removido com sucesso.' };
  }

  // ---------- Auxiliares ----------

  /** Define blocos reservados e participantes conforme o tipo (único ou grupo). */
  private montarReserva(dados: DadosReserva) {
    const grupo = dados.tipo_atendimento === 'grupo';

    const blocos = grupo ? blocosValidos(dados.blocos) : [dados.horario];
    if (!blocos.length) {
      throw new BadRequestException('Escolha ao menos um horário para o atendimento em grupo.');
    }

    const participantes = normalizarParticipantes(
      grupo ? dados.participantes : [{ nome: dados.nome, telefone: dados.telefone ?? undefined }],
    );
    if (!participantes.length) {
      throw new BadRequestException('Informe ao menos um participante.');
    }

    const principal = participantes[0];
    return { blocos, participantes, nome: principal.nome, telefone: principal.telefone };
  }

  /** Agendamento cancelado não ocupa horário. */
  private slotsParaCriar(status: string, dataISO: string, blocos: string[]) {
    if (status === 'cancelado') return undefined;
    const data = paraData(dataISO);
    return {
      create: blocos.map((h) => ({ data, horario_inicio: paraHorario(dataISO, h) })),
    };
  }
}
