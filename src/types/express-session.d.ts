import 'express-session';
import type { Papel } from '../auth/papel.enum';

// Única declaração dos dados guardados na sessão.
declare module 'express-session' {
  interface SessionData {
    papel?: Papel;
    usuario?: { id: number; nome: string; email: string };
    cidadaoId?: number;
  }
}
