import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Papel } from '../auth/papel.enum';
import { Papeis } from '../auth/papeis.decorator';
import { PapeisGuard } from '../auth/papeis.guard';
import { CidadaosService } from './cidadaos.service';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';

@UseGuards(PapeisGuard)
@Papeis(Papel.Admin)
@Controller('admin/cidadaos')
export class AdminCidadaosController {
  constructor(private readonly cidadaos: CidadaosService) {}

  @Get()
  listar(@Query('busca') busca?: string) {
    return this.cidadaos.listar(busca);
  }

  @Get(':id')
  detalhes(@Param('id', ParseIntPipe) id: number) {
    return this.cidadaos.detalhes(id);
  }

  @Patch(':id/senha')
  alterarSenha(@Param('id', ParseIntPipe) id: number, @Body() dto: AlterarSenhaDto) {
    return this.cidadaos.alterarSenha(id, dto.senha);
  }
}
