import { Logger } from '@nestjs/common';
import { SessionData, Store } from 'express-session';
import { PrismaService } from '../prisma/prisma.service';

type Callback = (err?: unknown) => void;

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const INTERVALO_LIMPEZA_MS = 15 * 60 * 1000;

/**
 * Guarda as sessões do express-session na tabela `sessoes`.
 * O MemoryStore padrão perde todos os logins a cada reinício e vaza memória.
 */
export class PrismaSessionStore extends Store {
  private readonly logger = new Logger(PrismaSessionStore.name);
  private readonly limpeza: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.limpeza = setInterval(() => void this.removerExpiradas(), INTERVALO_LIMPEZA_MS);
    // Não impede o processo de encerrar.
    this.limpeza.unref();
  }

  get(sid: string, callback: (err: unknown, sessao?: SessionData | null) => void): void {
    this.prisma.sessoes
      .findUnique({ where: { id: sid } })
      .then(async (registro) => {
        if (!registro) return callback(null, null);
        if (registro.expira_em.getTime() <= Date.now()) {
          await this.prisma.sessoes.deleteMany({ where: { id: sid } });
          return callback(null, null);
        }
        callback(null, JSON.parse(registro.dados) as SessionData);
      })
      .catch((e: unknown) => callback(e));
  }

  set(sid: string, sessao: SessionData, callback?: Callback): void {
    const dados = JSON.stringify(sessao);
    const expira_em = expiracao(sessao);
    this.prisma.sessoes
      .upsert({
        where: { id: sid },
        create: { id: sid, dados, expira_em },
        update: { dados, expira_em },
      })
      .then(() => callback?.())
      .catch((e: unknown) => callback?.(e));
  }

  destroy(sid: string, callback?: Callback): void {
    this.prisma.sessoes
      .deleteMany({ where: { id: sid } })
      .then(() => callback?.())
      .catch((e: unknown) => callback?.(e));
  }

  /** Renova a expiração sem regravar os dados (cookie com rolling/maxAge). */
  touch(sid: string, sessao: SessionData, callback?: Callback): void {
    this.prisma.sessoes
      .updateMany({ where: { id: sid }, data: { expira_em: expiracao(sessao) } })
      .then(() => callback?.())
      .catch((e: unknown) => callback?.(e));
  }

  async removerExpiradas(): Promise<number> {
    try {
      const { count } = await this.prisma.sessoes.deleteMany({
        where: { expira_em: { lt: new Date() } },
      });
      return count;
    } catch (e) {
      this.logger.warn(`Falha ao limpar sessões expiradas: ${String(e)}`);
      return 0;
    }
  }

  encerrar(): void {
    clearInterval(this.limpeza);
  }
}

function expiracao(sessao: SessionData): Date {
  // Depois de passar por JSON, cookie.expires pode chegar como string.
  const expires = sessao.cookie?.expires as Date | string | null | undefined;
  return expires ? new Date(expires) : new Date(Date.now() + UM_DIA_MS);
}
