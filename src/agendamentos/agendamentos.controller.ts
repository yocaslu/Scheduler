import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Papel } from '../auth/papel.enum';
import { Papeis } from '../auth/papeis.decorator';
import { PapeisGuard } from '../auth/papeis.guard';
import { AgendamentosService } from './agendamentos.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';

@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  // GET /api/agendamentos/disponiveis?data=AAAA-MM-DD (público)
  @Get('disponiveis')
  disponiveis(@Query('data') data?: string) {
    return this.agendamentos.horariosDisponiveis(data ?? '');
  }

  // POST /api/agendamentos (cidadão logado)
  @UseGuards(PapeisGuard)
  @Papeis(Papel.Cidadao)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post()
  criar(@Body() dto: CriarAgendamentoDto, @Req() req: Request) {
    // O guard garante que cidadaoId existe para o papel cidadão.
    return this.agendamentos.criarParaCidadao(dto, req.session.cidadaoId!);
  }
}
