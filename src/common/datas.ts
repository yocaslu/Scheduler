const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Confere se a string está no formato AAAA-MM-DD e representa um dia que existe. */
export function dataValida(dataISO: string): boolean {
  const match = FORMATO_DATA.exec(dataISO);
  if (!match) return false;

  const [ano, mes, dia] = match.slice(1).map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

/** Segunda a sexta-feira. */
export function diaUtil(dataISO: string): boolean {
  const match = FORMATO_DATA.exec(dataISO);
  if (!match) return false;

  const [ano, mes, dia] = match.slice(1).map(Number);
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();

  // 0 = domingo, 6 = sábado
  return diaSemana !== 0 && diaSemana !== 6;
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function hoje(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Converte AAAA-MM-DD para o Date usado nas colunas @db.Date. */
export function paraData(dataISO: string): Date {
  return new Date(`${dataISO}T00:00:00Z`);
}

/** Converte AAAA-MM-DD + HH:MM para o Date usado nas colunas @db.Time. */
export function paraHorario(dataISO: string, horario: string): Date {
  return new Date(`${dataISO}T${horario}:00Z`);
}

/** Date de uma coluna @db.Date para AAAA-MM-DD. */
export function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Date de uma coluna @db.Time para HH:MM. */
export function formatarHorario(horario: Date): string {
  return horario.toISOString().slice(11, 16);
}
