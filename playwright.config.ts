import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de navegador. Precisam da aplicação rodando (por exemplo, `docker compose up`).
 * Veja a seção "Testes de navegador" do README.
 */
export default defineConfig({
  testDir: './e2e',
  // Os testes seguem um roteiro (o cidadão agenda, depois o admin vê), então rodam em sequência.
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
