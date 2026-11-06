import { dados, entrar, expect, opcoes, test } from './apoio';

// Cada teste usa o que o anterior criou (o admin vê o pedido do cidadão etc.).
test.describe.configure({ mode: 'serial' });

const { cidadao, admin, balconista, atendimentoUnico, grupo } = dados;

test('cidadão se cadastra, agenda e cancela', async ({ page }) => {
  await test.step('cadastro', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Criar conta de cidadão' }).click();
    await expect(page).toHaveURL(/cadastro\.html$/);
    await page.locator('#nome').fill(cidadao.nome);
    await page.locator('#email').fill(cidadao.email);
    await page.locator('#telefone').fill(cidadao.telefone);
    await page.locator('#senha').fill(cidadao.senha);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.locator('#mensagem')).toHaveClass(/sucesso/);
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step('login leva à área do cidadão', async () => {
    await entrar(page, cidadao.email, cidadao.senha);
    await expect(page).toHaveURL(/cidadao\.html$/);
    await expect(page.locator('#boasVindas')).toContainText(cidadao.nome);
    await expect(page.getByText('Você ainda não possui agendamentos')).toBeVisible();
  });

  let horario = '';
  await test.step('agenda o primeiro horário livre', async () => {
    await page.getByRole('button', { name: 'Novo agendamento' }).click();
    await expect(page).toHaveURL(/agendamento\.html$/);
    await expect(page.locator('#boasVindas')).toContainText(cidadao.nome);
    await page.locator('#motivo').fill('Segunda via de documento');
    await page.locator('#data').fill(dados.data);
    await expect.poll(() => opcoes(page, '#horario')).not.toEqual([]);
    horario = (await opcoes(page, '#horario'))[0];
    await page.locator('#horario').selectOption(horario);
    await page.getByRole('button', { name: 'Confirmar atendimento' }).click();
    await expect(page.locator('#mensagem')).toHaveText('Pedido registrado com sucesso.');
  });

  await test.step('o horário agendado deixa de aparecer como livre', async () => {
    await page.locator('#data').fill('');
    await page.locator('#data').fill(dados.data);
    await expect.poll(() => opcoes(page, '#horario')).not.toContain(horario);
  });

  await test.step('vê o pedido e cancela', async () => {
    await page.getByRole('button', { name: 'Voltar' }).click();
    const cartao = page.locator('.agendamento-card');
    await expect(cartao).toContainText('Pedido pendente');
    await cartao.getByRole('button', { name: 'Cancelar' }).click();
    await expect(cartao).toContainText('Cancelado');
  });

  await test.step('agenda de novo para o painel ter um pedido pendente', async () => {
    await page.goto('/agendamento.html');
    await page.locator('#motivo').fill('Renovação de cadastro');
    await page.locator('#data').fill(dados.data);
    await expect.poll(() => opcoes(page, '#horario')).toContain(horario);
    await page.locator('#horario').selectOption(horario);
    await page.getByRole('button', { name: 'Confirmar atendimento' }).click();
    await expect(page.locator('#mensagem')).toHaveText('Pedido registrado com sucesso.');
  });

  await test.step('sair volta ao login', async () => {
    await page.goto('/cidadao.html');
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test('admin gerencia atendimentos, usuários e cidadãos', async ({ page }) => {
  const tabela = page.locator('#tabela');

  await test.step('login abre o painel com o pedido do cidadão', async () => {
    await entrar(page, admin.login, admin.senha);
    await expect(page).toHaveURL(/admin\.html$/);
    await expect(page.locator('#perfil')).toHaveText('Administrador');
    await page.locator('#filtroData').fill(dados.data);
    await expect(tabela).toContainText(cidadao.nome);
  });

  await test.step('cria atendimento único', async () => {
    await page.getByRole('button', { name: 'Novo atendimento' }).click();
    await page.locator('#editNome').fill(atendimentoUnico.nome);
    await page.locator('#editTelefone').fill(atendimentoUnico.telefone);
    await page.locator('#editData').fill(dados.data);
    await page.locator('#editHorario').fill(atendimentoUnico.horario);
    await page.locator('#editMotivo').fill('Atendimento presencial');
    await page.getByRole('button', { name: 'Salvar' }).click();
    const linha = tabela.locator('tr', { hasText: atendimentoUnico.nome });
    // O zero à esquerda do telefone precisa ser mantido.
    await expect(linha.locator('td').nth(4)).toHaveText(atendimentoUnico.telefone);
  });

  await test.step('cria atendimento em grupo', async () => {
    await page.getByRole('button', { name: 'Novo atendimento' }).click();
    await page.locator('#editData').fill(dados.data);
    await page.locator('#toggleGrupo').click();
    await expect.poll(() => opcoes(page, '#grupoInicio')).not.toEqual([]);
    await page.locator('.pNome').first().fill(grupo.participantes[0]);
    await page.getByRole('button', { name: '+ Adicionar pessoa' }).click();
    await page.locator('.pNome').nth(1).fill(grupo.participantes[1]);
    await page.locator('#grupoInicio').selectOption(grupo.inicio);
    await page.locator('#grupoFim').selectOption(grupo.fim);
    await page.locator('#editMotivo').fill('Reunião de condomínio');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(tabela.locator('tr', { hasText: grupo.participantes[0] })).toContainText(
      '2 pessoas',
    );
  });

  await test.step('o fim do grupo não atravessa horário ocupado', async () => {
    await page.getByRole('button', { name: 'Novo atendimento' }).click();
    await page.locator('#editData').fill(dados.data);
    await page.locator('#toggleGrupo').click();
    await expect.poll(() => opcoes(page, '#grupoInicio')).not.toEqual([]);
    await page.locator('#grupoInicio').selectOption('13:30');
    // 14:00 já está ocupado pelo grupo, então 13:30 é o único fim possível.
    expect(await opcoes(page, '#grupoFim')).toEqual(['13:30']);
    await page.locator('#fecharAtendimento').click();
  });

  await test.step('edita o grupo com participantes e horários carregados', async () => {
    const linha = tabela.locator('tr', { hasText: grupo.participantes[0] });
    await linha.getByRole('button', { name: 'Gerenciar' }).click();
    await expect(page.locator('.pNome')).toHaveCount(2);
    await expect(page.locator('.pNome').nth(1)).toHaveValue(grupo.participantes[1]);
    await expect(page.locator('#grupoInicio')).toHaveValue(grupo.inicio);
    await expect(page.locator('#grupoFim')).toHaveValue(grupo.fim);
    await page.locator('#editStatus').selectOption('pedido_atendido');
    await page.locator('#editTratativa').fill('Reunião realizada');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(linha).toContainText('Atendido');
  });

  await test.step('filtra por status', async () => {
    await page.locator('#filtroStatus').selectOption('pedido_atendido');
    await expect(tabela.locator('tr')).toHaveCount(1);
    await expect(tabela).toContainText(grupo.participantes[0]);
    await page.locator('#filtroStatus').selectOption('');
  });

  await test.step('pendências mostram o pedido do cidadão', async () => {
    await page.locator('#abaPendencias').click();
    await expect(page.locator('#tabelaPendencias')).toContainText(cidadao.nome);
  });

  await test.step('cria e edita um usuário balconista', async () => {
    await page.locator('#abaUsuarios').click();
    await page.getByRole('button', { name: 'Criar usuário' }).click();
    await page.locator('#usuarioNome').fill('Temporário');
    await page.locator('#usuarioEmail').fill(balconista.email);
    await page.locator('#usuarioPapel').selectOption('visualizador');
    await page.locator('#usuarioSenha').fill(balconista.senha);
    await page.locator('#formUsuario').getByRole('button', { name: 'Salvar' }).click();
    const linha = page.locator('#tabelaUsuarios tr', { hasText: balconista.email });
    await expect(linha).toContainText('Balconista');

    // Editar sem preencher a senha mantém a senha atual.
    await linha.getByRole('button', { name: 'Editar' }).click();
    await page.locator('#usuarioNome').fill(balconista.nome);
    await page.locator('#formUsuario').getByRole('button', { name: 'Salvar' }).click();
    await expect(linha).toContainText(balconista.nome);
  });

  await test.step('vê o histórico do cidadão e troca a senha', async () => {
    await page.locator('#abaCidadaos').click();
    await page.locator('#buscaCidadao').fill(cidadao.email);
    const linha = page.locator('#tabelaCidadaos tr', { hasText: cidadao.email });
    await linha.getByRole('button', { name: 'Ver histórico' }).click();
    const modal = page.locator('#modalCidadao');
    await expect(modal.locator('#detalheCidadao')).toContainText(cidadao.nome);
    await expect(modal.locator('#agendamentosCidadao')).toContainText('Renovação de cadastro');
    await page.locator('#novaSenha').fill(cidadao.novaSenha);
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await expect(page.locator('#msgSenha')).toHaveText('Senha alterada com sucesso!');
    await page.locator('#fecharCidadao').click();
  });

  await test.step('sair volta ao login', async () => {
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test('cidadão entra com a senha trocada pelo admin', async ({ page }) => {
  await entrar(page, cidadao.email, cidadao.novaSenha);
  await expect(page).toHaveURL(/cidadao\.html$/);
});

test('balconista vê só atendimentos e consegue criar', async ({ page }) => {
  await entrar(page, balconista.email, balconista.senha);
  await expect(page).toHaveURL(/admin\.html$/);
  await expect(page.locator('#perfil')).toHaveText('Balconista');

  const tabela = page.locator('#tabela');
  await page.locator('#filtroData').fill(dados.data);
  await expect(tabela).toContainText(cidadao.nome);
  await expect(page.locator('.tabs button')).toHaveText(['Atendimentos Cadastrados']);
  await expect(page.getByRole('button', { name: 'Gerenciar' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Novo atendimento' }).click();
  await page.locator('#editNome').fill(`Joana ${balconista.nome}`);
  await page.locator('#editData').fill(dados.data);
  await page.locator('#editHorario').fill('15:30');
  await page.locator('#editMotivo').fill('Protocolo');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(tabela).toContainText(`Joana ${balconista.nome}`);
});

test('páginas protegidas sem login voltam para o login', async ({ page }) => {
  for (const pagina of ['/cidadao.html', '/agendamento.html', '/admin.html']) {
    await page.goto(pagina);
    await expect(page, pagina).toHaveURL(/\/$/);
  }
});
