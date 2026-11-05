import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Papel } from './papel.enum';
import { PAPEIS_KEY } from './papeis.decorator';

/**
 * Exige sessão ativa e, se a rota usar @Papeis(...), um dos papéis listados.
 * O decorator no método tem prioridade sobre o da classe.
 */
@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Papel[] | undefined>(PAPEIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const sessao = context.switchToHttp().getRequest<Request>().session;
    const papel = sessao?.papel;

    if (!papel) {
      throw new UnauthorizedException('Faça login para continuar.');
    }
    if (papel === Papel.Cidadao && !sessao.cidadaoId) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }
    if (exigidos?.length && !exigidos.includes(papel)) {
      throw new ForbiddenException('Acesso negado.');
    }
    return true;
  }
}
