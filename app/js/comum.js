// Funções compartilhadas entre as telas.

export const $ = (id) => document.getElementById(id);

/** Escapa texto antes de inserir com innerHTML (evita XSS). */
export function escapeHtml(valor) {
  return String(valor ?? '').replace(
    /[&<>'"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c],
  );
}

/** Lê o corpo da resposta como JSON sem quebrar quando ele vem vazio ou em outro formato. */
export async function lerJson(resposta) {
  const texto = await resposta.text();
  if (!texto.trim()) return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inválida do servidor (${resposta.status}).`);
  }
}

/** fetch + JSON + erro com a mensagem da API. */
export async function api(url, opcoes = {}) {
  const config = { ...opcoes };
  if (config.body !== undefined && typeof config.body !== 'string') {
    config.headers = { 'Content-Type': 'application/json', ...config.headers };
    config.body = JSON.stringify(config.body);
  }
  const resposta = await fetch(url, config);
  const dados = await lerJson(resposta);
  if (!resposta.ok) {
    const erro = new Error(dados.mensagem || `Erro no servidor (${resposta.status}).`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

/** Blocos de horário do expediente, definidos no backend. */
export async function carregarHorarios() {
  const { horarios } = await api('/api/agendamentos/expediente');
  return horarios || [];
}

export async function sair() {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/';
}
