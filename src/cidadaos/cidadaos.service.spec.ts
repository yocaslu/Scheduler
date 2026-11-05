import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CidadaosService } from './cidadaos.service';

describe('CidadaosService', () => {
  it('não seleciona senha_hash nos detalhes', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 1, criado_em: new Date() });
    const prisma = {
      cidadaos: { findUnique },
      agendamentos: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CidadaosService(prisma as unknown as PrismaService);

    await service.detalhes(1);

    const select = findUnique.mock.calls[0][0].select;
    expect(select).toBeDefined();
    expect(select.senha_hash).toBeUndefined();
  });

  it('recusa cadastro com e-mail que já é da equipe', async () => {
    const prisma = {
      cidadaos: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      usuarios_admin: { findUnique: jest.fn().mockResolvedValue({ id: 9 }) },
    };
    const service = new CidadaosService(prisma as unknown as PrismaService);

    await expect(
      service.cadastrar({ nome: 'Ana', email: 'ana@ex.com', senha: '123456' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.cidadaos.create).not.toHaveBeenCalled();
  });
});
