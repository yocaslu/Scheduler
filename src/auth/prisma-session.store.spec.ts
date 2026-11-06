import { SessionData } from 'express-session';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaSessionStore } from './prisma-session.store';

function criarStore() {
  const sessoes = {
    findUnique: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const store = new PrismaSessionStore({ sessoes } as unknown as PrismaService);
  return { store, sessoes };
}

/** Converte o estilo callback do express-session em Promise. */
function obter(store: PrismaSessionStore, sid: string) {
  return new Promise<SessionData | null | undefined>((resolve, reject) =>
    store.get(sid, (err, sessao) => (err ? reject(err) : resolve(sessao))),
  );
}

describe('PrismaSessionStore', () => {
  let criados: PrismaSessionStore[] = [];
  afterEach(() => {
    criados.forEach((s) => s.encerrar());
    criados = [];
  });

  it('devolve a sessão gravada enquanto não expira', async () => {
    const { store, sessoes } = criarStore();
    criados.push(store);
    sessoes.findUnique.mockResolvedValue({
      id: 'abc',
      dados: JSON.stringify({ papel: 'admin' }),
      expira_em: new Date(Date.now() + 60_000),
    });

    await expect(obter(store, 'abc')).resolves.toEqual({ papel: 'admin' });
  });

  it('descarta e apaga sessão expirada', async () => {
    const { store, sessoes } = criarStore();
    criados.push(store);
    sessoes.findUnique.mockResolvedValue({
      id: 'abc',
      dados: '{}',
      expira_em: new Date(Date.now() - 1000),
    });

    await expect(obter(store, 'abc')).resolves.toBeNull();
    expect(sessoes.deleteMany).toHaveBeenCalledWith({ where: { id: 'abc' } });
  });

  it('grava com a expiração do cookie', async () => {
    const { store, sessoes } = criarStore();
    criados.push(store);
    const expires = new Date('2030-01-01T12:00:00Z');
    const sessao = { cookie: { expires } } as unknown as SessionData;

    await new Promise<void>((resolve) => store.set('abc', sessao, () => resolve()));

    expect(sessoes.upsert.mock.calls[0][0].create.expira_em).toEqual(expires);
  });

  it('repassa erro do banco para o express-session', async () => {
    const { store, sessoes } = criarStore();
    criados.push(store);
    sessoes.findUnique.mockRejectedValue(new Error('banco fora do ar'));

    await expect(obter(store, 'abc')).rejects.toThrow('banco fora do ar');
  });
});
