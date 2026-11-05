import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Papel } from '../auth/papel.enum';
import { Papeis } from '../auth/papeis.decorator';
import { PapeisGuard } from '../auth/papeis.guard';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './dto/usuario.dto';
import { UsuariosService } from './usuarios.service';

@UseGuards(PapeisGuard)
@Papeis(Papel.Admin)
@Controller('admin/usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar() {
    return this.usuarios.listar();
  }

  @Post()
  criar(@Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarUsuarioDto) {
    return this.usuarios.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.excluir(id);
  }
}
