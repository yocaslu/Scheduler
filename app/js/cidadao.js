import { $, api, escapeHtml, sair } from './comum.js';

const STATUS = {
  cancelado: 'Cancelado',
  pedido_nao_atendido: 'Pedido não atendido',
  pedido_atendido: 'Pedido atendido',
  pedido_pendente: 'Pedido pendente',
};
const ATENDIMENTO = { no_paco: 'No Paço', marcado: 'Marcado' };

function cartao(a) {
  const cancelar =
    a.status === 'pedido_pendente'
      ? `<button data-id="${a.id}" class="cancelar">Cancelar</button>`
      : '';
  return `<div class="agendamento-card">
    <strong>${escapeHtml(a.data_br)} às ${escapeHtml(a.horario)}</strong><br>
    Motivo: ${escapeHtml(a.motivo || '—')}<br>
    Status: <strong>${escapeHtml(STATUS[a.status] || a.status)}</strong><br>
    Atendimento: <strong>${escapeHtml(ATENDIMENTO[a.atendimento] || a.atendimento)}</strong><br>
    Tratativa: ${escapeHtml(a.tratativa || '—')}<br>${cancelar}
  </div>`;
}

async function cancelar(id) {
  if (!confirm('Deseja realmente cancelar este agendamento?')) return;
  try {
    await api(`/api/cidadao/agendamentos/${id}/cancelar`, { method: 'PATCH' });
    await carregar();
  } catch (err) {
    alert(err.message);
  }
}

async function carregar() {
  const lista = $('lista');
  try {
    const d = await api('/api/cidadao/meus-agendamentos');
    $('boasVindas').textContent =
      `Olá, ${d.cidadao.nome}. Telefone: ${d.cidadao.telefone || 'não informado'}.`;

    if (!d.agendamentos.length) {
      lista.innerHTML = '<p>Você ainda não possui agendamentos.</p>';
      return;
    }
    lista.innerHTML = d.agendamentos.map(cartao).join('');
    lista.querySelectorAll('.cancelar').forEach((b) => {
      b.addEventListener('click', () => cancelar(b.dataset.id));
    });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      location.href = '/';
      return;
    }
    lista.textContent = err.message;
  }
}

$('sair').addEventListener('click', sair);
carregar();
