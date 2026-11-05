
import { salvarAtendimento, verificar, carregar,mostrarAba, carregarPendencias, carregarUsuarios, carregarCidadaos, carregarHorariosGrupo, abrirModalAtendimento, alterarSenha, abrirCidadao,salvarUsuario, excluirUsuario, carregarDetalhesGrupo, editarPendente, aplicarModoGrupo, fecharModal, editar, montarSelectsGrupo, atualizarFimGrupo, blocosEntre, adicionarParticipante, abrirUsuario, editarUsuario  } from "./admin_functions.js";

Object.assign(window, {
  abrirCidadao,
  abrirUsuario,
  editarUsuario,
  excluirUsuario,
  alterarSenha,
  editar,
  editarPendente
});

let timer = null;
const $ = id => document.getElementById(id);


$('abaAtendimentos')?.addEventListener('click', () => { mostrarAba('Atendimentos'); carregar(); });
$('abaPendencias')?.addEventListener('click', () => { mostrarAba('Pendencias'); carregarPendencias(); });
$('abaUsuarios')?.addEventListener('click', () => { mostrarAba('Usuarios'); carregarUsuarios(); });
$('abaCidadaos')?.addEventListener('click', () => { mostrarAba('Cidadaos'); carregarCidadaos(); });

// Modal de Atendimento
if ($('novoAtendimento')) $('novoAtendimento').onclick = () => abrirModalAtendimento();
if ($('fecharAtendimento')) $('fecharAtendimento').onclick = () => fecharModal('modalAtendimento');
if ($('formAtendimento')) $('formAtendimento').onsubmit = salvarAtendimento;
if ($('toggleGrupo')) $('toggleGrupo').onclick = async () => { 
  const g = $('editTipo').value !== 'grupo'; 
  if (g) { $('participantes').innerHTML = ''; adicionarParticipante('', '', true); } 
  aplicarModoGrupo(g); 
  if (g) await carregarHorariosGrupo($('editData').value); 
};
if ($('adicionarParticipante')) $('adicionarParticipante').onclick = () => adicionarParticipante('', '', false);

// Modal de Usuário (Painel Admin)
if ($('novoUsuario')) $('novoUsuario').onclick = () => abrirUsuario();
if ($('fecharUsuario')) $('fecharUsuario').onclick = () => fecharModal('modalUsuario');
if ($('formUsuario')) $('formUsuario').onsubmit = salvarUsuario;

// Modal de Cidadão (Alterar Senha e Detalhes)
if ($('buscarCidadao')) $('buscarCidadao').onclick = carregarCidadaos;
if ($('fecharCidadao')) $('fecharCidadao').onclick = () => fecharModal('modalCidadao');
if ($('formSenha')) $('formSenha').onsubmit = alterarSenha;

// Filtros em tempo real
if ($('busca')) $('busca').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(carregar, 250); });
if ($('buscaCidadao')) $('buscaCidadao').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(carregarCidadaos, 250); });
if ($('filtroData')) $('filtroData').addEventListener('change', carregar);
if ($('filtroAtendimento')) $('filtroAtendimento').addEventListener('change', carregar);
if ($('filtroStatus')) $('filtroStatus').addEventListener('change', carregar);
if ($('editData')) $('editData').addEventListener('change', () => { if ($('editTipo').value === 'grupo') carregarHorariosGrupo($('editData').value); });
if ($('grupoInicio')) $('grupoInicio').addEventListener('change', atualizarFimGrupo);

// Botão Sair
if ($('sair')) $('sair').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/'; };

// Inicialização da página
verificar().then(ok => { if (ok) carregar(); });
