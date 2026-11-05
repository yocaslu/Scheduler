import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AgendamentosService } from '../agendamentos/agendamentos.service';
import { Papel } from '../auth/papel.enum';
import { Papeis } from '../auth/papeis.decorator';
import { PapeisGuard } from '../auth/papeis.guard';
import { CidadaosService } from './cidadaos.service';
import { CadastrarCidadaoDto } from './dto/cadastrar-cidadao.dto';

@Controller('cidadao')
export class CidadaosController {
  constructor(
    private readonly cidadaos: CidadaosService,
    private readonly agendamentos: AgendamentosService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('cadastro')
  cadastrar(@Body() dto: CadastrarCidadaoDto) {
    return this.cidadaos.cadastrar(dto);
  }

  // O PapeisGuard garante que req.session.cidadaoId existe nas rotas abaixo.

  @UseGuards(PapeisGuard)
  @Papeis(Papel.Cidadao)
  @Get('me')
  async perfil(@Req() req: Request) {
    return { autenticado: true, cidadao: await this.cidadaos.perfil(req.session.cidadaoId!) };
  }

  @UseGuards(PapeisGuard)
  @Papeis(Papel.Cidadao)
  @Get('meus-agendamentos')
  async meusAgendamentos(@Req() req: Request) {
    const cidadaoId = req.session.cidadaoId!;
    const [cidadao, agendamentos] = await Promise.all([
      this.cidadaos.perfil(cidadaoId),
      this.agendamentos.listarDoCidadao(cidadaoId),
    ]);
    return { cidadao, agendamentos };
  }

  @UseGuards(PapeisGuard)
  @Papeis(Papel.Cidadao)
  @Patch('agendamentos/:id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.agendamentos.cancelarPeloCidadao(id, req.session.cidadaoId!);
  }
}
