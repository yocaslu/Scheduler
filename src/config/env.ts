/**
 * Lê uma variável de ambiente obrigatória.
 * Falha na inicialização em vez de seguir com um valor padrão inseguro.
 */
export function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida. Veja o arquivo .env.example.`);
  }
  return valor;
}
