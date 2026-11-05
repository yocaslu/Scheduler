import { Module } from '@nestjs/common';
import { AgendamentosModule } from '../agendamentos/agendamentos.module';
import { AdminCidadaosController } from './admin-cidadaos.controller';
import { CidadaosController } from './cidadaos.controller';
import { CidadaosService } from './cidadaos.service';

@Module({
  imports: [AgendamentosModule],
  controllers: [CidadaosController, AdminCidadaosController],
  providers: [CidadaosService],
})
export class CidadaosModule {}
