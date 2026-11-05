import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Papel } from '../auth/papel.enum';
import { Papeis } from '../auth/papeis.decorator';
import { PapeisGuard } from '../auth/papeis.guard';
import { AgendamentosService } from './agendamentos.service';

@UseGuards(PapeisGuard)
@Papeis(Papel.Admin, Papel.Visualizador)
@Controller('admin')
export class PainelController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  // GET /api/admin/horarios?data=AAAA-MM-DD
  @Get('horarios')
  async horarios(@Query('data') data?: string) {
    return { horariosOcupados: await this.agendamentos.horariosOcupados(data ?? '') };
  }

  // GET /api/admin/pendencias
  @Papeis(Papel.Admin)
  @Get('pendencias')
  pendencias() {
    return this.agendamentos.pendencias();
  }
}
