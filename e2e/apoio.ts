import { expect, Page, test as base } from '@playwright/test';

/** Sufixo único por execução: o teste pode rodar várias vezes no mesmo banco. */
const execucao = Date.now().toString(36);

/** Segunda-feira sorteada entre 1 e ~400 semanas à frente, para não disputar horário com execuções anteriores. */
function segundaFutura(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7 * (1 + Math.floor(Math.random() * 400)));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function variavel(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Defina ${nome} (o mesmo valor do .env da aplicação).`);
  return valor;
}

export const dados = {
  data: segundaFutura(),
  admin: { login: variavel('ADMIN_USER'), senha: variavel('ADMIN_PASSWORD') },
  cidadao: {
    nome: `Elisa ${execucao}`,
    email: `elisa.${execucao}@teste.local`,
    telefone: '11988887777',
    senha: 'senha123',
    novaSenha: 'senhaNova456',
  },
  balconista: {
    nome: `Iara ${execucao}`,
    email: `iara.${execucao}@teste.local`,
    senha: 'balcao123',
  },
  atendimentoUnico: { nome: `Fábio ${execucao}`, telefone: '011912345678', horario: '13:00' },
  grupo: { participantes: [`Gabi ${execucao}`, `Hugo ${execucao}`], inicio: '14:00', fim: '15:00' },
};

/**
 * `page` que reprova o teste se houver erro de JavaScript ou um alert() na tela
 * (as telas usam alert para mostrar erros). Diálogos de confirmação são aceitos.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problemas: string[] = [];
    page.on('pageerror', (e) => problemas.push(`erro de JavaScript: ${e.message}`));
    page.on('dialog', (d) => {
      if (d.type() !== 'confirm') problemas.push(`alert: ${d.message()}`);
      void d.accept();
    });
    await use(page);
    expect(problemas, 'erros de JavaScript ou alertas na página').toEqual([]);
  },
});

export { expect };

export async function entrar(page: Page, login: string, senha: string) {
  await page.goto('/');
  await page.locator('#login').fill(login);
  await page.locator('#senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Opções de um <select>, sem a opção vazia de "Selecione". */
export async function opcoes(page: Page, seletor: string): Promise<string[]> {
  const valores = await page
    .locator(`${seletor} option`)
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  return valores.filter(Boolean);
}
