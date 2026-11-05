import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';
import { SessionData } from 'express-session';
import { PrismaService } from '../prisma/prisma.service';
import { Papel } from './papel.enum';

export interface ResultadoLogin {
  sessao: Pick<SessionData, 'papel' | 'usuario' | 'cidadaoId'>;
  tipo: Papel;
  redirect: string;
}

/** Compara strings em tempo constante para não vazar informação pelo tempo de resposta. */
function iguais(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async autenticar(login: string, senha: string): Promise<ResultadoLogin> {
    // 1. Administrador definido no .env (ADMIN_USER / ADMIN_PASSWORD)
    const adminUser = process.env.ADMIN_USER?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminUser && adminPassword && login === adminUser && iguais(senha, adminPassword)) {
      return {
        sessao: { papel: Papel.Admin, usuario: { id: 0, nome: 'Administrador', email: adminUser } },
        tipo: Papel.Admin,
        redirect: '/admin.html',
      };
    }

    // 2. Equipe cadastrada em usuarios_admin
    const equipe = await this.prisma.usuarios_admin.findUnique({ where: { email: login } });
    if (equipe && (await bcrypt.compare(senha, equipe.senha_hash))) {
      const papel = equipe.papel === 'admin' ? Papel.Admin : Papel.Visualizador;
      return {
        sessao: { papel, usuario: { id: equipe.id, nome: equipe.nome, email: equipe.email } },
        tipo: papel,
        redirect: '/admin.html',
      };
    }

    // 3. Cidadão
    const cidadao = await this.prisma.cidadaos.findUnique({ where: { email: login } });
    if (cidadao && (await bcrypt.compare(senha, cidadao.senha_hash))) {
      return {
        sessao: {
          papel: Papel.Cidadao,
          cidadaoId: cidadao.id,
          usuario: { id: cidadao.id, nome: cidadao.nome, email: cidadao.email },
        },
        tipo: Papel.Cidadao,
        redirect: '/cidadao.html',
      };
    }

    throw new UnauthorizedException('Usuário ou senha inválidos.');
  }

  async verificarBanco(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
