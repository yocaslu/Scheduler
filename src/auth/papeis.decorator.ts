import { SetMetadata } from '@nestjs/common';
import { Papel } from './papel.enum';

export const PAPEIS_KEY = 'papeis';

/** Define quais papéis podem acessar a rota (ou todas as rotas do controller). */
export const Papeis = (...papeis: Papel[]) => SetMetadata(PAPEIS_KEY, papeis);
