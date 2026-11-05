import { Module } from '@nestjs/common';
import { AdminAgendamentosController } from './admin-agendamentos.controller';
import { AgendamentosController } from './agendamentos.controller';
import { AgendamentosService } from './agendamentos.service';
import { PainelController } from './painel.controller';

@Module({
  controllers: [AgendamentosController, AdminAgendamentosController, PainelController],
  providers: [AgendamentosService],
  exports: [AgendamentosService],
})
export class AgendamentosModule {}
