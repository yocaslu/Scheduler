import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Papel } from './papel.enum';
import { Papeis } from './papeis.decorator';
import { PapeisGuard } from './papeis.guard';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('health')
  async health() {
    await this.auth.verificarBanco();
    return { ok: true };
  }

  // No máximo 5 tentativas de login por minuto por IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const resultado = await this.auth.autenticar(dto.login, dto.senha);

    // Gera um novo id de sessão no login para evitar fixação de sessão.
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) =>
        err ? reject(new InternalServerErrorException('Erro ao iniciar a sessão.')) : resolve(),
      ),
    );
    Object.assign(req.session, resultado.sessao);

    return { sucesso: true, tipo: resultado.tipo, redirect: resultado.redirect };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) =>
        err
          ? reject(new InternalServerErrorException('Erro ao encerrar a sessão.'))
          : resolve({ sucesso: true }),
      );
    });
  }

  @UseGuards(PapeisGuard)
  @Papeis(Papel.Admin, Papel.Visualizador)
  @Get('admin/me')
  adminMe(@Req() req: Request) {
    return { autenticado: true, usuario: req.session.usuario, papel: req.session.papel };
  }
}
