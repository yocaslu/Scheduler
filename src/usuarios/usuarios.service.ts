import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { formatarData } from '../common/datas';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './dto/usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const usuarios = await this.prisma.usuarios_admin.findMany({
      select: { id: true, nome: true, email: true, papel: true, criado_em: true },
      orderBy: { nome: 'asc' },
    });
    return { usuarios: usuarios.map((u) => ({ ...u, criado_em: formatarData(u.criado_em) })) };
  }

  async criar(dto: CriarUsuarioDto) {
    const [equipe, cidadao] = await Promise.all([
      this.prisma.usuarios_admin.findUnique({ where: { email: dto.email }, select: { id: true } }),
      this.prisma.cidadaos.findUnique({ where: { email: dto.email }, select: { id: true } }),
    ]);
    if (equipe || cidadao) {
      throw new ConflictException('Já existe um usuário ou cidadão com este e-mail.');
    }

    try {
      const novo = await this.prisma.usuarios_admin.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          papel: dto.papel ?? 'visualizador',
          senha_hash: await bcrypt.hash(dto.senha, 12),
        },
        select: { id: true },
      });
      return { sucesso: true, id: novo.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
      throw e;
    }
  }

  async atualizar(id: number, dto: AtualizarUsuarioDto) {
    await this.garantirExiste(id);
    await this.prisma.usuarios_admin.update({
      where: { id },
      data: {
        nome: dto.nome,
        papel: dto.papel,
        senha_hash: dto.senha ? await bcrypt.hash(dto.senha, 12) : undefined,
      },
    });
    return { sucesso: true };
  }

  async excluir(id: number) {
    await this.garantirExiste(id);
    await this.prisma.usuarios_admin.delete({ where: { id } });
    return { sucesso: true };
  }

  private async garantirExiste(id: number) {
    const usuario = await this.prisma.usuarios_admin.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
  }
}
