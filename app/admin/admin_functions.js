import { $, api, carregarHorarios, escapeHtml as esc } from '../js/comum.js';

// Preenchida por carregarExpediente() a partir da API; o backend é a única fonte da lista.
let HORARIOS = [];

const STATUS = {
  cancelado: 'Cancelado',
  pedido_nao_atendido: 'Não atendido',
  pedido_atendido: 'Atendido',
  pedido_pendente: 'Pendente',
};
const ATEND = { no_paco: 'No Paço', marcado: 'Telefone' };

let papel = '';
let cache = []; // Agendamentos exibidos na aba atual (para abrir a edição)
let cacheUsuarios = [];
let ocupadosGrupo = new Set(); // Horários ocupados na data do atendimento em grupo
let carregamentosGrupo = 0; // Contador para descartar respostas fora de ordem

/** AAAA-MM-DD -> DD/MM/AAAA */
const br = (v) => {
  if (!v) return '—';
  const str = String(v).slice(0, 10);
  if (str.includes('/')) return str;
  const [a, m, d] = str.split('-');
  return d && m && a ? `${d}/${m}/${a}` : str;
};

function mostrarErro(id, mensagem) {
  const el = $(id);
  if (!el) return alert(mensagem);
  el.textContent = mensagem;
  el.className = 'mensagem erro';
}

export async function carregarExpediente() {
  HORARIOS = await carregarHorarios();
}

// --- SESSÃO ---

export async function verificar() {
  try {
    const d = await api('/api/admin/me');
    papel = d.papel;
    $('perfil').textContent = papel === 'admin' ? 'Administrador' : 'Balconista';
    if (papel !== 'admin') {
      document.querySelectorAll('.admin-only').forEach((x) => x.remove());
      $('abaPendencias')?.remove();
    }
    return true;
  } catch (e) {
    if (e.status === 401 || e.status === 403) location.href = '/';
    else mostrarErro('mensagem', e.message);
    return false;
  }
}

// --- ATENDIMENTOS ---

function linhaAtendimento(a) {
  const grupo = a.tipo_atendimento === 'grupo';
  return `
    <tr class="${grupo ? 'grupo-row' : ''}">
      <td>${br(a.data)}</td>
      <td>${esc(a.horario)}${grupo ? '<br><span class="small">início</span>' : ''}</td>
      <td><span class="tag ${grupo ? 'grupo-tag' : ''}">${grupo ? 'GRUPO' : esc(ATEND[a.atendimento] || a.atendimento)}</span></td>
      <td><b>${esc(a.nome)}</b>${grupo ? `<br><span class="small">${esc(a.participantes_total ?? '')} pessoas</span>` : ''}</td>
      <td>${esc(a.telefone || '')}</td>
      <td>${esc(a.endereco || '')}</td>
      <td>${esc(a.motivo || '')}</td>
      <td>${esc(a.tratativa || '—')}</td>
      <td class="status">${esc(STATUS[a.status] || a.status)}</td>
      <td>${papel === 'admin' ? `<button data-editar="${a.id}">Gerenciar</button>` : ''}</td>
    </tr>`;
}

export async function carregar() {
  const filtros = {
    busca: $('busca').value.trim(),
    data: $('filtroData').value,
    status: $('filtroStatus').value,
    atendimento: $('filtroAtendimento').value,
  };
  const p = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
  $('mensagem').textContent = '';

  try {
    const x = await api('/api/admin/agendamentos?' + p);
    cache = x.agendamentos;
    $('tabela').innerHTML = cache.length
      ? cache.map(linhaAtendimento).join('')
      : '<tr><td colspan="10" class="vazio">Nenhum atendimento encontrado.</td></tr>';
  } catch (e) {
    mostrarErro('mensagem', e.message);
  }
}

export async function carregarPendencias() {
  try {
    const x = await api('/api/admin/pendencias');
    cache = x.agendamentos;
    $('tabelaPendencias').innerHTML = cache.length
      ? cache
          .map(
            (a) =>
              `<tr><td>${br(a.data)}</td><td>${esc(a.horario)}</td><td>${esc(a.nome)}</td><td>${esc(a.telefone || '')}</td><td>${esc(a.motivo || '')}</td><td>${esc(STATUS[a.status] || a.status)}</td><td><button data-editar="${a.id}">Gerenciar</button></td></tr>`,
          )
          .join('')
      : '<tr><td colspan="7" class="vazio">Nenhuma pendência.</td></tr>';
  } catch (e) {
    mostrarErro('msgPendencias', e.message);
  }
}

export async function salvarAtendimento(e) {
  e?.preventDefault();
  $('msgAtendimentoForm').textContent = '';
  $('msgAtendimentoForm').className = 'mensagem';

  const form = $('formAtendimento');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const id = $('editId').value;
  const grupo = $('editTipo').value === 'grupo';

  const participantes = grupo
    ? [...document.querySelectorAll('#participantes .participante')].map((p) => ({
        nome: p.querySelector('.pNome')?.value.trim() || '',
        telefone: p.querySelector('.pTelefone')?.value.trim() || '',
      }))
    : [];
  if (grupo && (!participantes.length || participantes.some((p) => !p.nome))) {
    return mostrarErro('msgAtendimentoForm', 'Preencha o nome de todos os participantes.');
  }

  const blocos = grupo ? blocosEntre($('grupoInicio').value, $('grupoFim').value) : [];
  if (grupo && !blocos.length) {
    return mostrarErro('msgAtendimentoForm', 'Escolha um início e um fim válidos.');
  }

  const dados = {
    nome: grupo ? participantes[0].nome : $('editNome').value.trim(),
    telefone: grupo ? participantes[0].telefone : $('editTelefone').value.trim(),
    endereco: $('editEndereco').value.trim(),
    atendimento: $('editAtendimento').value || 'no_paco',
    data: $('editData').value,
    horario: grupo ? blocos[0] : $('editHorario').value,
    motivo: $('editMotivo').value.trim(),
    status: $('editStatus').value || 'pedido_pendente',
    tratativa: $('editTratativa').value.trim(),
    tipo_atendimento: grupo ? 'grupo' : 'unico',
    participantes,
    blocos,
  };

  try {
    await api(id ? `/api/admin/agendamentos/${id}` : '/api/admin/agendamentos', {
      method: id ? 'PATCH' : 'POST',
      body: dados,
    });
    fecharModal('modalAtendimento');
    mostrarAba('Atendimentos');
    await carregar();
  } catch (err) {
    mostrarErro('msgAtendimentoForm', err.message);
  }
}

export function abrirModalAtendimento(a = null) {
  const grupo = a?.tipo_atendimento === 'grupo';
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  $('tituloAtendimento').textContent = a ? 'Gerenciar atendimento' : 'Novo atendimento';
  $('msgAtendimentoForm').textContent = '';
  $('editId').value = a?.id || '';
  $('editNome').value = a?.nome || '';
  $('editTelefone').value = a?.telefone || '';
  $('editEndereco').value = a?.endereco || '';
  $('editAtendimento').value = a?.atendimento || 'no_paco';
  $('editData').value = a?.data ? a.data.slice(0, 10) : hoje;
  $('editHorario').value = a?.horario || HORARIOS[0] || '';
  $('editMotivo').value = a?.motivo || '';
  $('editStatus').value = a?.status || 'pedido_pendente';
  $('editTratativa').value = a?.tratativa || '';
  $('participantes').innerHTML = '';

  aplicarModoGrupo(grupo);
  $('modalAtendimento').classList.add('aberto');
}

export async function editar(id) {
  const a = cache.find((x) => x.id === id);
  if (!a) return;
  abrirModalAtendimento(a);
  if (a.tipo_atendimento !== 'grupo') return;

  try {
    const d = await api(`/api/admin/agendamentos/${id}/detalhes`);
    d.participantes.forEach((p, i) => adicionarParticipante(p.nome, p.telefone || '', i === 0));
    if (!d.participantes.length) adicionarParticipante('', '', true);
    const ultimo = d.blocos[d.blocos.length - 1] || '';
    await carregarHorariosGrupo(a.data.slice(0, 10), d.blocos[0] || '', ultimo, d.blocos);
  } catch (e) {
    mostrarErro('msgAtendimentoForm', e.message);
  }
}

// --- ATENDIMENTO EM GRUPO ---

export function aplicarModoGrupo(grupo) {
  $('editTipo').value = grupo ? 'grupo' : 'unico';
  $('toggleGrupo').textContent = grupo ? 'Atendimento único' : 'Atendimento em grupo';
  $('blocoGrupo').classList.toggle('hidden', !grupo);
  $('blocoHorariosGrupo').classList.toggle('hidden', !grupo);
  $('campoHorario').classList.toggle('hidden', grupo);
  $('campoTelefone').classList.toggle('hidden', grupo);
  $('campoNome').classList.toggle('hidden', grupo);

  $('editNome').required = !grupo;
  $('editNome').disabled = grupo;
  $('editTelefone').disabled = grupo;
  $('editHorario').required = !grupo;
  $('editHorario').disabled = grupo;

  const edicao = Boolean($('editId').value);
  $('editStatus').closest('div').classList.toggle('hidden', !edicao);
  $('editTratativa').closest('div').classList.toggle('hidden', !edicao);
}

export function adicionarParticipante(nome = '', telefone = '', principal = false) {
  const wrap = document.createElement('div');
  wrap.className = 'participante';
  wrap.innerHTML = `<div style="flex:1"><span class="principal">${principal ? 'REPRESENTANTE PRINCIPAL' : 'PARTICIPANTE'}</span><input class="pNome" maxlength="150" placeholder="Nome completo" value="${esc(nome)}" required></div>${
    principal
      ? `<div style="flex:0 0 220px"><label>Telefone</label><input class="pTelefone" type="tel" maxlength="30" placeholder="Telefone" value="${esc(telefone)}"></div>`
      : '<div><button type="button" class="danger removerParticipante">Remover</button></div>'
  }`;
  wrap.querySelector('.removerParticipante')?.addEventListener('click', () => wrap.remove());
  $('participantes').appendChild(wrap);
}

/** Blocos de inicio até fim, ambos incluídos. */
export function blocosEntre(inicio, fim) {
  const a = HORARIOS.indexOf(inicio);
  const b = HORARIOS.indexOf(fim);
  if (a < 0 || b < 0 || b < a) return [];
  return HORARIOS.slice(a, b + 1);
}

/** Opções de "até": o próprio início e os blocos seguintes, parando no primeiro ocupado. */
export function atualizarFimGrupo(fimDesejado = '') {
  const inicio = $('grupoInicio').value;
  const opcoes = [];
  for (const h of HORARIOS.slice(Math.max(HORARIOS.indexOf(inicio), 0))) {
    if (ocupadosGrupo.has(h)) break;
    opcoes.push(h);
  }
  if (!inicio) opcoes.length = 0;

  $('grupoFim').innerHTML = opcoes
    .map((h) => `<option value="${h}" ${h === fimDesejado ? 'selected' : ''}>${h}</option>`)
    .join('');
  $('mensagemHorariosGrupo').textContent = opcoes.length
    ? 'Todos os horários do início até o último escolhido serão reservados.'
    : 'Não há horário livre nesta data.';
}

function montarSelectsGrupo(inicio = '', fim = '') {
  const livres = HORARIOS.filter((h) => !ocupadosGrupo.has(h));
  const escolhido = livres.includes(inicio) ? inicio : livres[0] || '';
  $('grupoInicio').innerHTML = livres
    .map((h) => `<option value="${h}" ${h === escolhido ? 'selected' : ''}>${h}</option>`)
    .join('');
  atualizarFimGrupo(fim);
}

/**
 * Carrega os horários ocupados da data. Na edição, `proprios` são os blocos do
 * próprio agendamento, que não contam como ocupados.
 */
export async function carregarHorariosGrupo(data, inicio = '', fim = '', proprios = []) {
  // Esvazia os selects enquanto carrega: opções de um modal anterior não podem ser
  // escolhidas antes de saber quais horários desta data estão ocupados.
  $('grupoInicio').innerHTML = '';
  $('grupoFim').innerHTML = '';
  $('mensagemHorariosGrupo').textContent = 'Carregando horários...';

  const pedido = ++carregamentosGrupo;
  let ocupados = new Set();
  let erro = '';
  if (data) {
    try {
      const x = await api('/api/admin/horarios?data=' + encodeURIComponent(data));
      ocupados = new Set(x.horariosOcupados.filter((h) => !proprios.includes(h)));
    } catch (e) {
      erro = e.message;
    }
  }
  // Se a data mudou enquanto esperava, esta resposta já está desatualizada.
  if (pedido !== carregamentosGrupo) return;
  ocupadosGrupo = ocupados;
  montarSelectsGrupo(inicio, fim);
  if (erro) $('mensagemHorariosGrupo').textContent = erro;
}

// --- USUÁRIOS DO PAINEL ---

export async function carregarUsuarios() {
  try {
    const x = await api('/api/admin/usuarios');
    cacheUsuarios = x.usuarios;
    $('tabelaUsuarios').innerHTML = cacheUsuarios.length
      ? cacheUsuarios
          .map(
            (u) => `
        <tr>
          <td><b>${esc(u.nome)}</b></td>
          <td>${esc(u.email)}</td>
          <td><span class="tag ${u.papel === 'admin' ? 'admin-tag' : ''}">${u.papel === 'admin' ? 'Administrador' : 'Balconista'}</span></td>
          <td>${br(u.criado_em)}</td>
          <td>
            <button data-editar-usuario="${u.id}">Editar</button>
            <button class="danger" data-excluir-usuario="${u.id}">Excluir</button>
          </td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="5" class="vazio">Nenhum usuário encontrado.</td></tr>';
  } catch (e) {
    mostrarErro('msgUsuarios', e.message);
  }
}

export function abrirUsuario(u = null) {
  $('tituloUsuario').textContent = u ? 'Editar usuário' : 'Criar usuário';
  $('usuarioId').value = u?.id || '';
  $('usuarioNome').value = u?.nome || '';
  $('usuarioEmail').value = u?.email || '';
  $('usuarioEmail').disabled = Boolean(u);
  $('usuarioPapel').value = u?.papel || 'visualizador';
  $('usuarioSenha').value = '';
  $('usuarioSenha').required = !u;
  $('msgUsuarioForm').textContent = '';
  $('modalUsuario').classList.add('aberto');
}

export function editarUsuario(id) {
  const u = cacheUsuarios.find((x) => x.id === id);
  if (u) abrirUsuario(u);
}

export async function salvarUsuario(e) {
  e?.preventDefault();
  const id = $('usuarioId').value;
  const body = {
    nome: $('usuarioNome').value.trim(),
    papel: $('usuarioPapel').value,
    senha: $('usuarioSenha').value,
  };
  // O e-mail não pode ser alterado depois de criado.
  if (!id) body.email = $('usuarioEmail').value.trim();

  try {
    await api(id ? `/api/admin/usuarios/${id}` : '/api/admin/usuarios', {
      method: id ? 'PATCH' : 'POST',
      body,
    });
    fecharModal('modalUsuario');
    await carregarUsuarios();
  } catch (err) {
    mostrarErro('msgUsuarioForm', err.message);
  }
}

export async function excluirUsuario(id) {
  if (!confirm('Excluir este usuário do painel?')) return;
  try {
    await api(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
    await carregarUsuarios();
  } catch (e) {
    alert(e.message);
  }
}

// --- CIDADÃOS ---

export async function carregarCidadaos() {
  const busca = $('buscaCidadao').value.trim();
  try {
    const x = await api(
      '/api/admin/cidadaos' + (busca ? '?busca=' + encodeURIComponent(busca) : ''),
    );
    $('tabelaCidadaos').innerHTML = x.cidadaos.length
      ? x.cidadaos
          .map(
            (c) => `
        <tr>
          <td><b>${esc(c.nome)}</b></td>
          <td>${esc(c.email)}</td>
          <td>${esc(c.telefone || '—')}</td>
          <td>${br(c.criado_em)}</td>
          <td><button data-abrir-cidadao="${c.id}">Ver histórico</button></td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="5" class="vazio">Nenhum cidadão encontrado.</td></tr>';
  } catch (e) {
    mostrarErro('msgCidadaos', e.message);
  }
}

export async function abrirCidadao(id) {
  let x;
  try {
    x = await api(`/api/admin/cidadaos/${id}`);
  } catch (e) {
    return alert(e.message);
  }

  $('senhaCidadaoId').value = id;
  $('detalheCidadao').innerHTML =
    `<div class="card"><b>${esc(x.cidadao.nome)}</b><br>E-mail: ${esc(x.cidadao.email)}<br>Telefone: ${esc(x.cidadao.telefone || '—')}<br>Cadastro: ${br(x.cidadao.criado_em)}</div>`;
  $('agendamentosCidadao').innerHTML = x.agendamentos.length
    ? x.agendamentos
        .map(
          (a) =>
            `<div class="card"><b>${esc(a.data_br)} às ${esc(a.horario)}</b><br>${esc(a.motivo || '—')}<br>Status: <b>${esc(STATUS[a.status] || a.status)}</b> · Atendimento: ${esc(ATEND[a.atendimento] || a.atendimento)}<br>Tratativa: ${esc(a.tratativa || '—')}</div>`,
        )
        .join('')
    : '<p>Nenhum agendamento.</p>';
  $('msgSenha').textContent = '';
  $('novaSenha').value = '';
  $('modalCidadao').classList.add('aberto');
}

export async function alterarSenha(e) {
  e?.preventDefault();
  const id = $('senhaCidadaoId').value;
  const senha = $('novaSenha').value;
  const msg = $('msgSenha');
  if (!id || !senha) return;

  try {
    await api(`/api/admin/cidadaos/${id}/senha`, { method: 'PATCH', body: { senha } });
    msg.textContent = 'Senha alterada com sucesso!';
    msg.className = 'sucesso';
    $('novaSenha').value = '';
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'erro';
  }
}

// --- NAVEGAÇÃO ---

export function fecharModal(id) {
  $(id)?.classList.remove('aberto');
}

export function mostrarAba(nome) {
  ['Atendimentos', 'Pendencias', 'Usuarios', 'Cidadaos'].forEach((x) =>
    $('painel' + x)?.classList.add('hidden'),
  );
  $('painel' + nome)?.classList.remove('hidden');
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('ativo'));
  $('aba' + nome)?.classList.add('ativo');
}

/**
 * Botões criados dinamicamente nas tabelas usam atributos data-* em vez de onclick,
 * então não é preciso expor funções no window.
 */
export function registrarAcoesDasTabelas() {
  document.addEventListener('click', (e) => {
    const botao = e.target.closest('button');
    if (!botao) return;
    const {
      editar: idEditar,
      editarUsuario: idUsuario,
      excluirUsuario: idExcluir,
      abrirCidadao: idCidadao,
    } = botao.dataset;
    if (idEditar) editar(Number(idEditar));
    else if (idUsuario) editarUsuario(Number(idUsuario));
    else if (idExcluir) excluirUsuario(Number(idExcluir));
    else if (idCidadao) abrirCidadao(Number(idCidadao));
  });
}
