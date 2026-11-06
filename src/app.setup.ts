import { INestApplication, ValidationPipe } from '@nestjs/common';
import session, { Store } from 'express-session';
import { PrismaSessionStore } from './auth/prisma-session.store';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { obrigatoria } from './config/env';
import { PrismaService } from './prisma/prisma.service';

export interface OpcoesApp {
  /** Store de sessão. Por padrão as sessões ficam no banco (tabela `sessoes`). */
  store?: Store;
}

/** Configuração compartilhada entre o main.ts e os testes e2e. */
export function configurarApp(app: INestApplication, opcoes: OpcoesApp = {}) {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // O frontend é servido pelo próprio Nest (mesma origem), então CORS não é habilitado.

  // COOKIE_SECURE=true somente quando o site estiver atrás de HTTPS.
  const cookieSeguro = process.env.COOKIE_SECURE === 'true';
  if (cookieSeguro) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(
    session({
      name: 'scheduler.sid',
      store: opcoes.store ?? new PrismaSessionStore(app.get(PrismaService)),
      secret: obrigatoria('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 8, // 8 horas
        httpOnly: true,
        sameSite: 'lax',
        secure: cookieSeguro,
      },
    }),
  );
}
