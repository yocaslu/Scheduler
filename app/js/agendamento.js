import { $, api, escapeHtml } from './comum.js';

const dataInput = $('data');
const horarioSelect = $('horario');
const form = $('formAgendamento');
const mensagem = $('mensagem');

// Não permite escolher datas passadas no calendário.
dataInput.min = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

function preencher(horarios) {
  horarioSelect.innerHTML =
    '<option value="">Selecione um horário</option>' +
    horarios.map((h) => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
}

async function carregarConta() {
  try {
    const x = await api('/api/cidadao/me');
    $('boasVindas').textContent =
      `Olá, ${x.cidadao.nome}. Escolha somente a data e o horário do atendimento.`;
  } catch (err) {
    if (err.status === 401 || err.status === 403) location.href = '/';
    else alert(err.message);
  }
}

async function atualizarHorarios() {
  if (!dataInput.value) return;

  const [ano, mes, dia] = dataInput.value.split('-').map(Number);
  const diaSemana = new Date(ano, mes - 1, dia).getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    alert('Atendimento apenas em dias úteis.');
    dataInput.value = '';
    preencher([]);
    return;
  }

  try {
    const x = await api(
      '/api/agendamentos/disponiveis?data=' + encodeURIComponent(dataInput.value),
    );
    preencher(x.horariosDisponiveis || []);
    if (!x.horariosDisponiveis?.length) {
      mensagem.className = 'erro';
      mensagem.textContent = 'Não há horários livres nesta data.';
    } else {
      mensagem.textContent = '';
    }
  } catch (err) {
    preencher([]);
    alert(err.message);
  }
}

dataInput.addEventListener('change', atualizarHorarios);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!dataInput.value || !horarioSelect.value) {
    alert('Selecione a data e o horário.');
    return;
  }

  try {
    await api('/api/agendamentos', {
      method: 'POST',
      body: {
        motivo: $('motivo').value.trim(),
        data: dataInput.value,
        horario: horarioSelect.value,
      },
    });
    mensagem.className = 'sucesso';
    mensagem.textContent = 'Pedido registrado com sucesso.';
    form.reset();
    preencher([]);
  } catch (err) {
    alert(err.message);
    // O horário pode ter sido ocupado por outra pessoa: atualiza a lista.
    if (err.status === 409) atualizarHorarios();
  }
});

carregarConta();
