import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Sobe a aplicação inteira com um Prisma falso para conferir autenticação,
 * permissões e validação de entrada sem precisar de banco.
 */
describe('Rotas (e2e)', () => {
  let app: INestApplication;
  const senhaHash = bcrypt.hashSync('senha123', 4);
  let armazenamento = new ThrottlerStorageService();

  const prismaFalso = {
    usuarios_admin: {
      findUnique: jest.fn(({ where }: { where: { email?: string } }) =>
        where.email === 'balcao@ex.com'
          ? {
              id: 2,
              nome: 'Balcão',
              email: 'balcao@ex.com',
              papel: 'visualizador',
              senha_hash: senhaHash,
            }
          : null,
      ),
    },
    cidadaos: { findUnique: jest.fn().mockResolvedValue(null) },
    agendamentos: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'segredo-de-teste';
    process.env.ADMIN_USER = 'admin@ex.com';
    process.env.ADMIN_PASSWORD = 'admin123';

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaFalso)
      .overrideProvider(getStorageToken())
      .useValue({
        increment: (...args: Parameters<ThrottlerStorageService['increment']>) =>
          armazenamento.increment(...args),
      })
      .compile();

    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  // Rate limit novo a cada teste; o teste de 429 no fim confere o limite.
  beforeEach(() => {
    armazenamento = new ThrottlerStorageService();
  });

  async function loginComo(login: string, senha: string) {
    const agente = request.agent(app.getHttpServer());
    await agente.post('/api/login').send({ login, senha }).expect(200);
    return agente;
  }

  it('pendências exigem login', async () => {
    const r = await request(app.getHttpServer()).get('/api/admin/pendencias');
    expect(r.status).toBe(401);
    expect(r.body.mensagem).toBeDefined();
  });

  it('horários ocupados do painel exigem login', () =>
    request(app.getHttpServer()).get('/api/admin/horarios?data=2026-11-09').expect(401));

  it('agendar exige login de cidadão', () =>
    request(app.getHttpServer())
      .post('/api/agendamentos')
      .send({ motivo: 'x', data: '2099-01-05', horario: '09:00' })
      .expect(401));

  it('login sem senha responde 400 com mensagem', async () => {
    const r = await request(app.getHttpServer()).post('/api/login').send({ login: 'a@a.com' });
    expect(r.status).toBe(400);
    expect(r.body.mensagem).toContain('senha');
  });

  it('login com campo extra responde 400', () =>
    request(app.getHttpServer())
      .post('/api/login')
      .send({ login: 'a@a.com', senha: 'x', papel: 'admin' })
      .expect(400));

  it('visualizador lista agendamentos, mas não exclui nem vê pendências', async () => {
    const agente = await loginComo('balcao@ex.com', 'senha123');

    await agente.get('/api/admin/agendamentos').expect(200);
    await agente.delete('/api/admin/agendamentos/1').expect(403);
    await agente.get('/api/admin/pendencias').expect(403);
    expect(prismaFalso.agendamentos.delete).not.toHaveBeenCalled();
  });

  it('visualizador não acessa rotas de cidadão', async () => {
    const agente = await loginComo('balcao@ex.com', 'senha123');
    await agente.get('/api/cidadao/meus-agendamentos').expect(403);
  });

  it('admin do .env vê pendências', async () => {
    const agente = await loginComo('admin@ex.com', 'admin123');
    await agente.get('/api/admin/pendencias').expect(200);
  });

  it('filtro de status inválido responde 400 em vez de 500', async () => {
    const agente = await loginComo('admin@ex.com', 'admin123');
    await agente.get('/api/admin/agendamentos?status=aprovado').expect(400);
  });

  it('senha errada responde 401', () =>
    request(app.getHttpServer())
      .post('/api/login')
      .send({ login: 'balcao@ex.com', senha: 'errada' })
      .expect(401));

  it('bloqueia a sexta tentativa de login no mesmo minuto', async () => {
    const servidor = app.getHttpServer();
    for (let i = 0; i < 5; i++) {
      await request(servidor)
        .post('/api/login')
        .send({ login: 'x@ex.com', senha: 'y' })
        .expect(401);
    }
    const r = await request(servidor).post('/api/login').send({ login: 'x@ex.com', senha: 'y' });
    expect(r.status).toBe(429);
    expect(r.body.mensagem).toContain('Aguarde');
  });
});
