import { INestApplication, ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { obrigatoria } from './config/env';

/** Configuração compartilhada entre o main.ts e os testes e2e. */
export function configurarApp(app: INestApplication) {
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
