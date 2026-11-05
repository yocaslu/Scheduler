import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { obrigatoria } from '../config/env';

/** Converte a DATABASE_URL (mysql://usuario:senha@host:porta/banco) na configuração do adapter. */
function configuracaoDoBanco(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    connectTimeout: 5000,
    connectionLimit: 10,
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaMariaDb(configuracaoDoBanco(obrigatoria('DATABASE_URL'))) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
