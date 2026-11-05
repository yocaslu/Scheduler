import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { AuthModule } from './auth/auth.module';
import { CidadaosModule } from './cidadaos/cidadaos.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'app'),
      exclude: ['/api/*path'],
    }),
    // Limite geral por IP; rotas sensíveis (login, cadastro) têm limites menores.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 300 }],
      errorMessage: 'Muitas requisições. Aguarde um minuto e tente novamente.',
    }),
    PrismaModule,
    AuthModule,
    AgendamentosModule,
    CidadaosModule,
    UsuariosModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
