import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);

  const porta = Number(process.env.PORT) || 3000;
  // 0.0.0.0 para aceitar conexões de fora do container.
  await app.listen(porta, '0.0.0.0');
}

void bootstrap();
