import { $, api } from './comum.js';

$('formCadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const m = $('mensagem');
  m.textContent = '';
  m.className = '';

  const campos = ['nome', 'email', 'senha', 'telefone', 'cep', 'endereco'];
  const body = Object.fromEntries(campos.map((id) => [id, $(id).value]));

  try {
    await api('/api/cidadao/cadastro', { method: 'POST', body });
    m.className = 'sucesso';
    m.textContent = 'Cadastro realizado. Redirecionando para o login...';
    setTimeout(() => (location.href = '/'), 800);
  } catch (err) {
    m.className = 'erro';
    m.textContent = err.message;
  }
});
