import { $, api } from './comum.js';

const mensagem = $('mensagem');

$('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  mensagem.textContent = '';
  mensagem.className = '';

  const login = $('login').value.trim();
  const senha = $('senha').value;
  if (!login || !senha) {
    mensagem.className = 'erro';
    mensagem.textContent = 'Preencha o login/e-mail e a senha.';
    return;
  }

  try {
    const d = await api('/api/login', { method: 'POST', body: { login, senha } });
    location.href = d.redirect;
  } catch (err) {
    mensagem.className = 'erro';
    mensagem.textContent = err.message;
  }
});
