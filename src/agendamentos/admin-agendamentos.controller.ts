import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Papel } from '../auth/papel.enum';
import { Papeis } from '../auth/papeis.decorator';
import { PapeisGuard } from '../auth/papeis.guard';
import { AgendamentosService } from './agendamentos.service';
import {
  AtualizarAgendamentoAdminDto,
  CriarAgendamentoAdminDto,
  FiltroAgendamentosDto,
} from './dto/agendamento-admin.dto';

/** Agendamentos no painel. Visualizador (balconista) lista e cria; só admin altera e remove. */
@UseGuards(PapeisGuard)
@Papeis(Papel.Admin, Papel.Visualizador)
@Controller('admin/agendamentos')
export class AdminAgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get()
  listar(@Query() filtro: FiltroAgendamentosDto) {
    return this.agendamentos.listar(filtro);
  }

  @Post()
  criar(@Body() dto: CriarAgendamentoAdminDto) {
    return this.agendamentos.criarPeloPainel(dto);
  }

  @Get(':id/detalhes')
  detalhes(@Param('id', ParseIntPipe) id: number) {
    return this.agendamentos.detalhes(id);
  }

  @Papeis(Papel.Admin)
  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarAgendamentoAdminDto) {
    return this.agendamentos.atualizarPeloPainel(id, dto);
  }

  @Papeis(Papel.Admin)
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.agendamentos.excluir(id);
  }
}
