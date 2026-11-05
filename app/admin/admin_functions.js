const HORARIOS = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
const STATUS = { cancelado: 'Cancelado', pedido_nao_atendido: 'Não atendido', pedido_atendido: 'Atendido', pedido_pendente: 'Pendente' };
const ATEND = { no_paco: 'No Paço', marcado: 'telefone' };

let papel = '';
let cache = [];
let cacheUsuarios = []; // Cache local para busca rápida de usuários ao editar
let timer = null;

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const br = v => {
  if (!v) return '—';
  const str = String(v).slice(0, 10);
  if (str.includes('/')) return str; // Já está formatado
  const [a, m, d] = str.split('-');
  return d && m && a ? `${d}/${m}/${a}` : str;
};



// --- SALVAR ATENDIMENTO (CIDADÃO / ADMIN / GRUPO) ---
export async function salvarAtendimento(e) {
  if (e) e.preventDefault();
  
  const msgEl = $('msgAtendimentoForm');
  if (msgEl) {
    msgEl.textContent = '';
    msgEl.className = 'mensagem';
  }

  const id = $('editId')?.value;
  const grupo = $('editTipo')?.value === 'grupo';
  const form = $('formAtendimento');

  if (form && !form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const participantes = grupo 
    ? [...document.querySelectorAll('#participantes .participante')].map(p => ({
        nome: p.querySelector('.pNome')?.value.trim() || '',
        telefone: p.querySelector('.pTelefone')?.value.trim() || ''
      })) 
    : [];

  if (grupo && (!participantes.length || participantes.some(p => !p.nome))) {
    alert('Preencha o nome de todos os participantes antes de salvar.');
    return;
  }

  const blocos = grupo ? blocosEntre($('grupoInicio')?.value, $('grupoFim')?.value) : [];
  if (grupo && !blocos.length) {
    alert('Escolha um início e um fim válidos.');
    return;
  }

  const dados = {
    nome: grupo ? (participantes[0]?.nome || '') : $('editNome')?.value.trim(),
    telefone: grupo ? (participantes[0]?.telefone || '') : $('editTelefone')?.value.trim(),
    endereco: $('editEndereco')?.value.trim() || '',
    email: '',
    atendimento: $('editAtendimento')?.value || 'no_paco',
    data: $('editData')?.value,
    horario: grupo ? blocos[0] : $('editHorario')?.value,
    motivo: $('editMotivo')?.value.trim(),
    status: $('editStatus')?.value || 'pedido_pendente',
    tratativa: $('editTratativa')?.value.trim() || '',
    tipo_atendimento: grupo ? 'grupo' : 'unico',
    participantes,
    blocos
  };

  try {
  const r = await fetch(id ? '/api/admin/agendamentos/' + id : '/api/admin/agendamentos', {
    method: id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  const texto = await r.text();
  let x = {};

  // Executa o parse apenas se o servidor retornou algum texto
  if (texto.trim()) {
    try {
      x = JSON.parse(texto);
    } catch (err) {
      console.error('Resposta bruta do servidor:', texto);
      throw new Error('Servidor retornou uma resposta com formato inválido.');
    }
  }

  if (!r.ok) {
    throw new Error(x.mensagem || x.message || `Erro no servidor (${r.status})`);
  }

  fecharModal('modalAtendimento');
  mostrarAba('Atendimentos');
  carregar();
} catch (err) {
  const msgEl = $('msgAtendimentoForm');
  if (msgEl) {
    msgEl.textContent = err.message;
    msgEl.className = 'mensagem erro';
  } else {
    alert(err.message);
  }
}
}
// --- FUNÇÕES DE ATENDIMENTO EM GRUPO ---

export function atualizarFimGrupo() {
  const inicio = $('grupoInicio')?.value;
  if (!inicio) return;
  const i = HORARIOS.indexOf(inicio);
  const ocupados = window.horariosOcupadosGrupo || new Set();
  const opcoes = HORARIOS.slice(i + 1).filter(h => !ocupados.has(h));
  if ($('grupoFim')) $('grupoFim').innerHTML = opcoes.map(h => `<option value="${h}">${h}</option>`).join('');
  if ($('mensagemHorariosGrupo')) {
    $('mensagemHorariosGrupo').textContent = opcoes.length 
      ? 'Escolha quando o atendimento termina. Todos os blocos entre início e fim serão reservados.' 
      : 'Não há horário disponível após o início escolhido.';
  }
}

export function montarSelectsGrupo(inicio = '', fim = '', ocupados = []) {
  const ocup = new Set(ocupados);
  const disponiveis = HORARIOS.filter(h => !ocup.has(h));
  const mk = (valor) => disponiveis.map(h => `<option value="${h}" ${h === valor ? 'selected' : ''}>${h}</option>`).join('');
  if ($('grupoInicio')) $('grupoInicio').innerHTML = mk(inicio || disponiveis[0] || '');
  if ($('grupoFim')) $('grupoFim').innerHTML = mk(fim || disponiveis[Math.min(1, disponiveis.length - 1)] || '');
  atualizarFimGrupo();
}

export async function carregarHorariosGrupo(data, inicio = '', fim = '', proprios = []) {
  window.horariosOcupadosGrupo = new Set();
  if (!data) { montarSelectsGrupo(inicio, fim, []); return; }
  try {
    const r = await fetch('/api/admin/horarios?data=' + encodeURIComponent(data));
    const texto = await r.text();
    let x = {};
    if (texto.trim()) {
      try { x = JSON.parse(texto); } catch (err) { throw new Error('Erro na resposta de horários do servidor.'); }
    }
    if (!r.ok) throw Error(x.mensagem || 'Erro ao carregar horários.');
    window.horariosOcupadosGrupo = new Set((x.horariosOcupados || []).filter(h => !proprios.includes(h)));
    montarSelectsGrupo(inicio, fim, [...window.horariosOcupadosGrupo]);
  } catch (e) {
    if ($('mensagemHorariosGrupo')) $('mensagemHorariosGrupo').textContent = e.message;
    montarSelectsGrupo('', '', []);
  }
}

export function adicionarParticipante(nome = '', telefone = '', principal = false) {
  const wrap = document.createElement('div'); 
  wrap.className = 'participante';
  wrap.innerHTML = `<div style="flex:1"><span class="principal">${principal ? 'REPRESENTANTE PRINCIPAL' : 'PARTICIPANTE'}</span><input class="pNome" maxlength="150" placeholder="Nome completo" value="${esc(nome)}" required></div>${principal ? '<div style="flex:0 0 220px"><label>Telefone</label><input class="pTelefone" maxlength="30" placeholder="Telefone" value="' + esc(telefone) + '"></div>' : '<div><button type="button" class="danger removerParticipante">Remover</button></div>'}`;
  wrap.querySelector('.removerParticipante')?.addEventListener('click', () => wrap.remove());
  $('participantes')?.appendChild(wrap);
}

export async function carregarDetalhesGrupo(id) {
  try {
    const r = await fetch('/api/admin/agendamentos/' + id + '/detalhes');
    const texto = await r.text();
    let x = {};
    if (texto.trim()) {
      try { x = JSON.parse(texto); } catch (err) { throw new Error('Erro na resposta de detalhes do servidor.'); }
    }
    if (!r.ok) throw Error(x.mensagem || 'Erro ao obter detalhes.');
    return x;
  } catch (e) {
    alert(e.message);
    return { participantes: [], blocos: [] };
  }
}

// --- VERIFICAÇÃO DE SESSÃO DO PAINEL ---
export async function verificar() {
  try {
    const r = await fetch('/api/admin/me');
    
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        location.href = '/';
      }
      return false;
    }

    const texto = await r.text();
    const d = texto.trim() ? JSON.parse(texto) : {};

    papel = d.papel || d.tipo;
    if ($('perfil')) $('perfil').textContent = papel === 'admin' ? 'Administrador' : 'Balconista';
    if (papel !== 'admin') {
      document.querySelectorAll('.admin-only').forEach(x => x.remove());
      $('abaPendencias')?.remove();
    }
    return true;
  } catch (e) {
    console.error('Servidor offline ou falha de rede ao verificar sessão:', e);
    return false;
  }
}
// 1. Conversão segura de datas para exibição em PT-BR


// 2. Função de carregamento com suporte flexível à API
export async function carregar() {
  const p = new URLSearchParams(), 
        b = $('busca')?.value.trim() || '', 
        d = $('filtroData')?.value || '', 
        s = $('filtroStatus')?.value || '', 
        a = $('filtroAtendimento')?.value || '';
        
  if (b) p.set('busca', b); 
  if (d) p.set('data', d); 
  if (s) p.set('status', s); 
  if (a) p.set('atendimento', a);
  
  const m = $('mensagem');
  if (m) m.textContent = '';
  
  try {
    const r = await fetch('/api/admin/agendamentos?' + p);
    
    // Leitura segura do corpo da resposta (uma única vez)
    const texto = await r.text();
    let x = {};
    if (texto.trim()) {
      try {
        x = JSON.parse(texto);
      } catch (err) {
        console.error('Resposta não é JSON válido:', texto);
        throw new Error('Formato de resposta inválido do servidor.');
      }
    }

    if (!r.ok) throw new Error(x.mensagem || x.message || `Erro HTTP ${r.status}`);

    // SUPORTE FLEXÍVEL: Aceita se a API retornar Array [...] ou Objeto { agendamentos: [...] }
    cache = Array.isArray(x) ? x : (x.agendamentos || []);

    if ($('tabela')) {
      $('tabela').innerHTML = cache.length ? cache.map(a => `
        <tr class="${a.tipo_atendimento === 'grupo' ? 'grupo-row' : ''}">
          <td>${br(a.data || a.data_br)}</td>
          <td>${esc(a.horario)}${a.tipo_atendimento === 'grupo' ? '<br><span class="small">' + (a.horario ? 'início' : '') + '</span>' : ''}</td>
          <td><span class="tag ${a.tipo_atendimento === 'grupo' ? 'grupo-tag' : ''}">${a.tipo_atendimento === 'grupo' ? 'GRUPO' : esc(ATEND[a.atendimento] || a.atendimento)}</span></td>
          <td><b>${esc(a.nome)}</b>${a.tipo_atendimento === 'grupo' ? `<br><span class="small">${a.participantes_total || 'Várias'} pessoas</span>` : ''}</td>
          <td>${esc(a.telefone || '')}</td>
          <td>${esc(a.endereco || '')}</td>
          <td>${esc(a.motivo || '')}</td>
          <td>${esc(a.tratativa || '—')}</td>
          <td class="status">${esc(STATUS[a.status] || a.status)}</td>
          <td>${papel === 'admin' ? `<button onclick="editar(${a.id})">Gerenciar</button>` : ''}</td>
        </tr>`).join('') : '<tr><td colspan="10" class="vazio">Nenhum atendimento encontrado.</td></tr>';
    }
  } catch (e) {
    console.error('Erro ao carregar atendimentos:', e);
    if (m) { m.textContent = e.message; m.className = 'erro'; }
  }
}

// 3. Exposição global necessária para os botões com onclick no HTML
Object.assign(window, {
  editar,
  editarPendente,
  editarUsuario,
  excluirUsuario,
  abrirCidadao
});
document.addEventListener('DOMContentLoaded', carregar);

export async function carregarPendencias() {
  try {
    const r = await fetch('/api/admin/pendencias');
    const texto = await r.text();
    let x = {};
    if (texto.trim()) {
      try { x = JSON.parse(texto); } catch (err) { return; }
    }
    if (!r.ok) { if ($('msgPendencias')) $('msgPendencias').textContent = x.mensagem; return; }
    
    const pendencias = Array.isArray(x) ? x : (x.agendamentos || []);
    if ($('tabelaPendencias')) {
      $('tabelaPendencias').innerHTML = pendencias.length ? pendencias.map(a => `<tr><td>${br(a.data)}</td><td>${esc(a.horario)}</td><td>${esc(a.nome)}</td><td>${esc(a.telefone || '')}</td><td>${esc(a.motivo || '')}</td><td>${esc(STATUS[a.status] || a.status)}</td><td><button onclick="editarPendente(${a.id})">Gerenciar</button></td></tr>`).join('') : '<tr><td colspan="7" class="vazio">Nenhuma pendência.</td></tr>';
    }
    cache = pendencias;
  } catch (e) {
    console.error('Erro ao carregar pendências:', e);
  }
}

// --- GERENCIAMENTO DE USUÁRIOS DO PAINEL ---
export async function carregarUsuarios() {
  try {
    const r = await fetch('/api/admin/usuarios');
    const texto = await r.text();
    let x = {};
    if (texto.trim()) {
      try { x = JSON.parse(texto); } catch (err) { return; }
    }
    if (!r.ok) throw new Error(x.mensagem || 'Erro ao carregar usuários.');

    cacheUsuarios = Array.isArray(x) ? x : (x.usuarios || []);

    if ($('tabelaUsuarios')) {
      $('tabelaUsuarios').innerHTML = cacheUsuarios.length ? cacheUsuarios.map(u => `
        <tr>
          <td><b>${esc(u.nome)}</b></td>
          <td>${esc(u.email)}</td>
          <td><span class="tag ${u.papel === 'admin' ? 'admin-tag' : ''}">${u.papel === 'admin' ? 'Administrador' : 'Balconista'}</span></td>
          <td>${br(u.criado_em)}</td>
          <td>
            <button onclick="editarUsuario(${u.id})">Editar</button>
            <button class="danger" onclick="excluirUsuario(${u.id})">Excluir</button>
          </td>
        </tr>
      `).join('') : '<tr><td colspan="5" class="vazio">Nenhum usuário encontrado.</td></tr>';
    }
  } catch (e) {
    console.error('Erro ao carregar usuários:', e);
  }
}

export function editarUsuario(id) {
  const u = cacheUsuarios.find(x => x.id === id);
  if (u) abrirUsuario(u);
}

export async function salvarUsuario(e) {
  if (e) e.preventDefault();
  const id = $('usuarioId').value;
  const d = {
    nome: $('usuarioNome').value.trim(),
    email: $('usuarioEmail').value.trim(),
    papel: $('usuarioPapel').value,
    senha: $('usuarioSenha').value
  };
  try {
    const r = await fetch(id ? '/api/admin/usuarios/' + id : '/api/admin/usuarios', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    });
    const x = await r.json();
    if (!r.ok) throw Error(x.mensagem || 'Erro ao salvar usuário.');
    fecharModal('modalUsuario');
    carregarUsuarios();
  } catch (e) {
    if ($('msgUsuarioForm')) {
      $('msgUsuarioForm').textContent = e.message;
      $('msgUsuarioForm').className = 'erro';
    }
  }
}

export async function excluirUsuario(id) {
  if (!confirm('Excluir este usuário do painel?')) return;
  const r = await fetch('/api/admin/usuarios/' + id, { method: 'DELETE' });
  const x = await r.json();
  if (!r.ok) return alert(x.mensagem || 'Erro ao excluir usuário.');
  carregarUsuarios();
}

// --- CIDADÃOS E HISTÓRICO ---
export async function carregarCidadaos() {
  const busca = $('buscaCidadao')?.value.trim() || '';
  try {
    const r = await fetch('/api/admin/cidadaos' + (busca ? '?busca=' + encodeURIComponent(busca) : ''));
    const texto = await r.text();
    let x = {};
    if (texto.trim()) {
      try { x = JSON.parse(texto); } catch (err) { return; }
    }
    if (!r.ok) throw new Error(x?.mensagem || 'Erro ao carregar cidadãos.');

    const lista = Array.isArray(x) ? x : (x.cidadaos || []);

    if ($('tabelaCidadaos')) {
      $('tabelaCidadaos').innerHTML = lista.length ? lista.map(c => `
        <tr>
          <td><b>${esc(c.nome)}</b></td>
          <td>${esc(c.email)}</td>
          <td>${esc(c.telefone || '—')}</td>
          <td>${br(c.criado_em)}</td>
          <td><button onclick="abrirCidadao('${c.id}')">Ver Histórico</button></td>
        </tr>
      `).join('') : '<tr><td colspan="5" class="vazio">Nenhum cidadão encontrado.</td></tr>';
    }
  } catch (e) {
    console.error('Erro ao carregar cidadãos:', e);
  }
}

export async function abrirCidadao(id) {
  const r = await fetch('/api/admin/cidadaos/' + id);
  const x = await r.json();
  if (!r.ok) return alert(x.mensagem || 'Erro ao carregar dados do cidadão.');

  if ($('senhaCidadaoId')) $('senhaCidadaoId').value = id;
  if ($('detalheCidadao')) {
    $('detalheCidadao').innerHTML = `<div class="card"><b>${esc(x.cidadao.nome)}</b><br>E-mail: ${esc(x.cidadao.email)}<br>Telefone: ${esc(x.cidadao.telefone || '—')}<br>Cadastro: ${esc(x.cidadao.criado_em)}</div>`;
  }
  if ($('agendamentosCidadao')) {
    $('agendamentosCidadao').innerHTML = x.agendamentos.length ? x.agendamentos.map(a => `<div class="card"><b>${esc(a.data_br || br(a.data))} às ${esc(a.horario)}</b><br>${esc(a.motivo || '—')}<br>Status: <b>${esc(STATUS[a.status] || a.status)}</b> · Atendimento: ${esc(ATEND[a.atendimento] || a.atendimento)}<br>Tratativa: ${esc(a.tratativa || '—')}</div>`).join('') : '<p>Nenhum agendamento.</p>';
  }
  if ($('msgSenha')) $('msgSenha').textContent = '';
  if ($('novaSenha')) $('novaSenha').value = '';
  $('modalCidadao')?.classList.add('aberto');
}

export async function alterarSenha(e) {
  if (e) e.preventDefault();
  const id = $('senhaCidadaoId')?.value;
  const novaSenha = $('novaSenha')?.value;
  const msg = $('msgSenha');

  if (!id || !novaSenha) return;

  try {
    const r = await fetch(`/api/admin/cidadaos/${id}/senha`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: novaSenha })
    });
    const x = await r.json();
    if (!r.ok) throw new Error(x.mensagem || 'Erro ao alterar senha.');
    
    if (msg) {
      msg.textContent = 'Senha alterada com sucesso!';
      msg.className = 'sucesso';
    }
    if ($('novaSenha')) $('novaSenha').value = '';
  } catch (err) {
    if (msg) {
      msg.textContent = err.message;
      msg.className = 'erro';
    }
  }
}

// --- AUXILIARES E ESTRUTURA DO MODAL ---
export function abrirModalAtendimento(a = null) {
  const grupo = a?.tipo_atendimento === 'grupo';
  const dataHoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  if ($('tituloAtendimento')) $('tituloAtendimento').textContent = a ? 'Gerenciar atendimento' : 'Novo atendimento';
  if ($('editId')) $('editId').value = a?.id || '';
  if ($('editNome')) $('editNome').value = a?.nome || '';
  if ($('editTelefone')) $('editTelefone').value = a?.telefone || '';
  if ($('editEndereco')) $('editEndereco').value = a?.endereco || '';
  if ($('editAtendimento')) $('editAtendimento').value = a?.atendimento || 'no_paco';
  
  if ($('editData')) $('editData').value = a?.data ? a.data.slice(0, 10) : dataHoje;
  if ($('editHorario')) $('editHorario').value = a?.horario || HORARIOS[0];
  
  if ($('editMotivo')) $('editMotivo').value = a?.motivo || '';
  if ($('editStatus')) $('editStatus').value = a?.status || 'pedido_pendente';
  if ($('editTratativa')) $('editTratativa').value = a?.tratativa || '';
  if ($('editTipo')) $('editTipo').value = grupo ? 'grupo' : 'unico';
  
  if ($('participantes')) $('participantes').innerHTML = '';
  
  aplicarModoGrupo(grupo);
  $('modalAtendimento')?.classList.add('aberto');
}

export async function editar(id) {
  const a = cache.find(x => x.id === id);
  if (!a) return;
  abrirModalAtendimento(a);
  if (a.tipo_atendimento !== 'grupo') return;

  const d = await carregarDetalhesGrupo(id);
  if ($('participantes')) $('participantes').innerHTML = '';
  d.participantes.forEach((p, i) => adicionarParticipante(p.nome, p.telefone || '', i === 0));
  if (!d.participantes.length) adicionarParticipante('', '', true);

  // blocosEntre(inicio, fim) não inclui o fim, então o fim é o horário seguinte ao último bloco.
  const inicio = d.blocos[0] || '';
  const ultimo = HORARIOS.indexOf(d.blocos[d.blocos.length - 1]);
  const fim = ultimo >= 0 ? HORARIOS[ultimo + 1] || '' : '';
  await carregarHorariosGrupo(a.data.slice(0, 10), inicio, fim, d.blocos);
}
export function editarPendente(id) { return editar(id); }

export function abrirUsuario(u = null) {
  if ($('tituloUsuario')) $('tituloUsuario').textContent = u ? 'Editar usuário' : 'Criar usuário';
  if ($('usuarioId')) $('usuarioId').value = u?.id || '';
  if ($('usuarioNome')) $('usuarioNome').value = u?.nome || '';
  if ($('usuarioEmail')) $('usuarioEmail').value = u?.email || '';
  if ($('usuarioEmail')) $('usuarioEmail').disabled = !!u;
  if ($('usuarioPapel')) $('usuarioPapel').value = u?.papel || 'visualizador';
  if ($('usuarioSenha')) $('usuarioSenha').value = '';
  if ($('usuarioSenha')) $('usuarioSenha').required = !u;
  if ($('msgUsuarioForm')) $('msgUsuarioForm').textContent = '';
  $('modalUsuario')?.classList.add('aberto');
}

export function aplicarModoGrupo(grupo) {
  if ($('editTipo')) $('editTipo').value = grupo ? 'grupo' : 'unico';
  if ($('toggleGrupo')) $('toggleGrupo').textContent = grupo ? 'Atendimento único' : 'Atendimento em grupo';
  $('blocoGrupo')?.classList.toggle('hidden', !grupo);
  $('blocoHorariosGrupo')?.classList.toggle('hidden', !grupo);
  $('campoHorario')?.classList.toggle('hidden', grupo);
  $('campoTelefone')?.classList.toggle('hidden', grupo);
  $('campoNome')?.classList.toggle('hidden', grupo);
  
  if ($('editNome')) { $('editNome').required = !grupo; $('editNome').disabled = grupo; }
  if ($('editTelefone')) { $('editTelefone').required = !grupo; $('editTelefone').disabled = grupo; }
  if ($('editHorario')) $('editHorario').disabled = grupo;
  if ($('editData')) $('editData').required = true;
  if ($('editMotivo')) $('editMotivo').required = true;
  
  const edicao = Boolean($('editId')?.value);
  $('editStatus')?.closest('div')?.classList.toggle('hidden', !edicao);
  $('editTratativa')?.closest('div')?.classList.toggle('hidden', !edicao);
}

export function fecharModal(id) { $(id)?.classList.remove('aberto'); }

export function mostrarAba(nome) {
  ['Atendimentos', 'Pendencias', 'Usuarios', 'Cidadaos'].forEach(x => $('painel' + x)?.classList.add('hidden'));
  $('painel' + nome)?.classList.remove('hidden');
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('ativo'));
  const b = $('aba' + nome);
  if (b) b.classList.add('ativo');
}

export function blocosEntre(inicio, fim) {
  const a = HORARIOS.indexOf(inicio), b = HORARIOS.indexOf(fim);
  if (a < 0 || b < 0 || b <= a) return [];
  return HORARIOS.slice(a, b);
}

// --- EXPOSIÇÃO GLOBAL DE FUNÇÕES PARA OS EVENTOS ONCLICK DO HTML ---
if (typeof window !== 'undefined') {
  window.editar = editar;
  window.editarPendente = editarPendente;
  window.abrirCidadao = abrirCidadao;
  window.editarUsuario = editarUsuario;
  window.excluirUsuario = excluirUsuario;
  window.salvarAtendimento = salvarAtendimento;
  window.salvarUsuario = salvarUsuario;
  window.alterarSenha = alterarSenha;
  window.atualizarFimGrupo = atualizarFimGrupo;
  window.montarSelectsGrupo = montarSelectsGrupo;
  window.carregarHorariosGrupo = carregarHorariosGrupo;
  window.adicionarParticipante = adicionarParticipante;
}