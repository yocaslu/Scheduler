import { $, sair } from '../js/comum.js';
import {
  abrirModalAtendimento,
  abrirUsuario,
  adicionarParticipante,
  alterarSenha,
  aplicarModoGrupo,
  atualizarFimGrupo,
  carregar,
  carregarCidadaos,
  carregarExpediente,
  carregarHorariosGrupo,
  carregarPendencias,
  carregarUsuarios,
  fecharModal,
  mostrarAba,
  registrarAcoesDasTabelas,
  salvarAtendimento,
  salvarUsuario,
  verificar,
} from './admin_functions.js';

/** Executa `fn` só depois de `ms` sem novas chamadas (busca enquanto digita). */
function aoParar(fn, ms = 250) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

// Abas (as de admin podem ter sido removidas para o balconista)
$('abaAtendimentos').addEventListener('click', () => {
  mostrarAba('Atendimentos');
  carregar();
});
$('abaPendencias')?.addEventListener('click', () => {
  mostrarAba('Pendencias');
  carregarPendencias();
});
$('abaUsuarios')?.addEventListener('click', () => {
  mostrarAba('Usuarios');
  carregarUsuarios();
});
$('abaCidadaos')?.addEventListener('click', () => {
  mostrarAba('Cidadaos');
  carregarCidadaos();
});

// Modal de atendimento
$('novoAtendimento').addEventListener('click', () => abrirModalAtendimento());
$('fecharAtendimento').addEventListener('click', () => fecharModal('modalAtendimento'));
$('formAtendimento').addEventListener('submit', salvarAtendimento);
$('toggleGrupo').addEventListener('click', async () => {
  const grupo = $('editTipo').value !== 'grupo';
  $('participantes').innerHTML = '';
  if (grupo) adicionarParticipante('', '', true);
  aplicarModoGrupo(grupo);
  if (grupo) await carregarHorariosGrupo($('editData').value);
});
$('adicionarParticipante').addEventListener('click', () => adicionarParticipante());
$('editData').addEventListener('change', () => {
  if ($('editTipo').value === 'grupo') carregarHorariosGrupo($('editData').value);
});
$('grupoInicio').addEventListener('change', () => atualizarFimGrupo());

// Modal de usuário
$('novoUsuario')?.addEventListener('click', () => abrirUsuario());
$('fecharUsuario').addEventListener('click', () => fecharModal('modalUsuario'));
$('formUsuario').addEventListener('submit', salvarUsuario);

// Modal de cidadão
$('buscarCidadao')?.addEventListener('click', carregarCidadaos);
$('buscaCidadao')?.addEventListener('input', aoParar(carregarCidadaos));
$('fecharCidadao').addEventListener('click', () => fecharModal('modalCidadao'));
$('formSenha').addEventListener('submit', alterarSenha);

// Filtros
$('busca').addEventListener('input', aoParar(carregar));
['filtroData', 'filtroAtendimento', 'filtroStatus'].forEach((id) =>
  $(id).addEventListener('change', carregar),
);

$('sair').addEventListener('click', sair);
registrarAcoesDasTabelas();

// Inicialização: horários do expediente, sessão e lista de atendimentos.
try {
  await carregarExpediente();
  if (await verificar()) await carregar();
} catch (e) {
  $('mensagem').textContent = e.message;
}
