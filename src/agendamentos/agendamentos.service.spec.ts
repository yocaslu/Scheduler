import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgendamentosService } from './agendamentos.service';

const erroDuplicado = new Prisma.PrismaClientKnownRequestError('duplicado', {
  code: 'P2002',
  clientVersion: 'teste',
});

const cidadao = { nome: 'Ana', email: 'ana@ex.com', telefone: null, cep: null, endereco: null };

/** Próxima segunda-feira a partir de amanhã, para não depender da data de execução. */
function proximaSegunda(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function criarService(prisma: object) {
  return new AgendamentosService(prisma as unknown as PrismaService);
}

describe('AgendamentosService', () => {
  describe('criarParaCidadao', () => {
    it('responde 409 quando o horário já está ocupado', async () => {
      const prisma = {
        cidadaos: { findUnique: jest.fn().mockResolvedValue(cidadao) },
        agendamentos: { create: jest.fn().mockRejectedValue(erroDuplicado) },
      };
      const service = criarService(prisma);

      await expect(
        service.criarParaCidadao({ motivo: 'x', data: proximaSegunda(), horario: '09:00' }, 1),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('recusa fim de semana sem consultar o banco', async () => {
      const prisma = { cidadaos: { findUnique: jest.fn() } };
      const service = criarService(prisma);

      await expect(
        service.criarParaCidadao({ motivo: 'x', data: '2099-01-03', horario: '09:00' }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.cidadaos.findUnique).not.toHaveBeenCalled();
    });

    it('usa nome e e-mail do cadastro e reserva o slot', async () => {
      const create = jest.fn().mockResolvedValue({ id: 10 });
      const prisma = {
        cidadaos: { findUnique: jest.fn().mockResolvedValue(cidadao) },
        agendamentos: { create },
      };
      const data = proximaSegunda();

      await criarService(prisma).criarParaCidadao({ motivo: 'x', data, horario: '10:30' }, 1);

      const enviado = create.mock.calls[0][0].data;
      expect(enviado.nome).toBe('Ana');
      expect(enviado.email).toBe('ana@ex.com');
      expect(enviado.agendamento_slots.create).toHaveLength(1);
    });
  });

  describe('criarPeloPainel', () => {
    it('reserva todos os blocos de um atendimento em grupo', async () => {
      const create = jest.fn().mockResolvedValue({ id: 1 });
      const service = criarService({ agendamentos: { create } });

      await service.criarPeloPainel({
        nome: 'Ana',
        motivo: 'Reunião',
        data: '2026-11-09',
        horario: '09:00',
        tipo_atendimento: 'grupo',
        blocos: ['09:00', '09:30', '10:00'],
        participantes: [{ nome: 'Ana' }, { nome: 'Bia' }],
      });

      const enviado = create.mock.calls[0][0].data;
      expect(enviado.agendamento_slots.create).toHaveLength(3);
      expect(enviado.agendamento_participantes.create).toHaveLength(2);
    });

    it('não reserva horário para agendamento já criado como cancelado', async () => {
      const create = jest.fn().mockResolvedValue({ id: 1 });
      const service = criarService({ agendamentos: { create } });

      await service.criarPeloPainel({
        nome: 'Ana',
        motivo: 'x',
        data: '2026-11-09',
        horario: '09:00',
        status: 'cancelado',
      });

      expect(create.mock.calls[0][0].data.agendamento_slots).toBeUndefined();
    });
  });

  describe('atualizarPeloPainel', () => {
    it('libera os slots ao cancelar', async () => {
      const atual = {
        id: 5,
        nome: 'Ana',
        telefone: null,
        data: new Date('2026-11-09T00:00:00Z'),
        horario: new Date('2026-11-09T09:00:00Z'),
        status: 'pedido_pendente',
        tipo_atendimento: 'unico',
        blocos_json: ['09:00'],
        data_registro: new Date(),
        agendamento_participantes: [{ nome: 'Ana', telefone: null }],
        agendamento_slots: [{ horario_inicio: new Date('1970-01-01T09:00:00Z') }],
      };
      const tx = {
        agendamento_slots: { deleteMany: jest.fn() },
        agendamento_participantes: { deleteMany: jest.fn() },
        agendamentos: { update: jest.fn().mockResolvedValue({ ...atual, status: 'cancelado' }) },
      };
      const prisma = {
        agendamentos: { findUnique: jest.fn().mockResolvedValue(atual) },
        $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
      };

      await criarService(prisma).atualizarPeloPainel(5, { status: 'cancelado' });

      expect(tx.agendamento_slots.deleteMany).toHaveBeenCalledWith({
        where: { agendamento_id: 5 },
      });
      expect(tx.agendamentos.update.mock.calls[0][0].data.agendamento_slots).toBeUndefined();
    });
  });
});
