import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { formatarAgendamento } from '../agendamentos/agendamentos.service';
import { formatarData } from '../common/datas';
import { PrismaService } from '../prisma/prisma.service';
import { CadastrarCidadaoDto } from './dto/cadastrar-cidadao.dto';

/** Campos que podem sair do backend. senha_hash nunca entra aqui. */
const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  cep: true,
  endereco: true,
  criado_em: true,
} satisfies Prisma.cidadaosSelect;

@Injectable()
export class CidadaosService {
  constructor(private readonly prisma: PrismaService) {}

  async cadastrar(dto: CadastrarCidadaoDto) {
    // O login procura o e-mail na equipe antes dos cidadãos; um e-mail repetido
    // impediria o cidadão de entrar.
    const [cidadao, equipe] = await Promise.all([
      this.prisma.cidadaos.findUnique({ where: { email: dto.email }, select: { id: true } }),
      this.prisma.usuarios_admin.findUnique({ where: { email: dto.email }, select: { id: true } }),
    ]);
    if (cidadao || equipe) throw new ConflictException('Este e-mail já está cadastrado.');

    const { senha, ...dados } = dto;
    try {
      const novo = await this.prisma.cidadaos.create({
        data: { ...dados, senha_hash: await bcrypt.hash(senha, 12) },
        select: { id: true },
      });
      return { sucesso: true, id: novo.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
      throw e;
    }
  }

  async perfil(id: number) {
    const cidadao = await this.prisma.cidadaos.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, telefone: true },
    });
    if (!cidadao) throw new NotFoundException('Cidadão não encontrado.');
    return cidadao;
  }

  async listar(busca?: string) {
    const termo = busca?.trim();
    const cidadaos = await this.prisma.cidadaos.findMany({
      where: termo
        ? {
            OR: [
              { nome: { contains: termo } },
              { email: { contains: termo } },
              { telefone: { contains: termo } },
            ],
          }
        : undefined,
      select: CAMPOS_PUBLICOS,
      orderBy: { nome: 'asc' },
      take: 100,
    });
    return { cidadaos: cidadaos.map((c) => ({ ...c, criado_em: formatarData(c.criado_em) })) };
  }

  async detalhes(id: number) {
    const cidadao = await this.prisma.cidadaos.findUnique({
      where: { id },
      select: CAMPOS_PUBLICOS,
    });
    if (!cidadao) throw new NotFoundException('Cidadão não encontrado.');

    const agendamentos = await this.prisma.agendamentos.findMany({
      where: { cidadao_id: id },
      orderBy: [{ data: 'desc' }, { horario: 'asc' }],
    });

    return {
      cidadao: { ...cidadao, criado_em: formatarData(cidadao.criado_em) },
      agendamentos: agendamentos.map(formatarAgendamento),
    };
  }

  async alterarSenha(id: number, senha: string) {
    const cidadao = await this.prisma.cidadaos.findUnique({ where: { id }, select: { id: true } });
    if (!cidadao) throw new NotFoundException('Cidadão não encontrado.');

    await this.prisma.cidadaos.update({
      where: { id },
      data: { senha_hash: await bcrypt.hash(senha, 12) },
    });
    return { sucesso: true, mensagem: 'Senha alterada com sucesso.' };
  }
}
