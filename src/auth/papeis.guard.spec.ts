import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionData } from 'express-session';
import { Papel } from './papel.enum';
import { PapeisGuard } from './papeis.guard';

function contexto(sessao: Partial<SessionData> | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ session: sessao }) }),
  } as unknown as ExecutionContext;
}

function guardExigindo(papeis: Papel[] | undefined) {
  const reflector = { getAllAndOverride: () => papeis } as unknown as Reflector;
  return new PapeisGuard(reflector);
}

describe('PapeisGuard', () => {
  it('responde 401 sem sessão', () => {
    expect(() => guardExigindo([Papel.Admin]).canActivate(contexto(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('responde 403 quando o papel não está na lista', () => {
    const ctx = contexto({ papel: Papel.Visualizador });
    expect(() => guardExigindo([Papel.Admin]).canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('não deixa um admin passar numa rota de cidadão', () => {
    const ctx = contexto({ papel: Papel.Admin, usuario: { id: 3, nome: 'A', email: 'a@a' } });
    expect(() => guardExigindo([Papel.Cidadao]).canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('exige cidadaoId na sessão de cidadão', () => {
    const ctx = contexto({ papel: Papel.Cidadao });
    expect(() => guardExigindo([Papel.Cidadao]).canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('libera quando o papel está na lista', () => {
    const ctx = contexto({ papel: Papel.Visualizador });
    expect(guardExigindo([Papel.Admin, Papel.Visualizador]).canActivate(ctx)).toBe(true);
  });
});
