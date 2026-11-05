/** Blocos de 30 minutos do expediente. Única fonte desta lista no backend. */
export const HORARIOS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

export interface ParticipanteInput {
  nome: string;
  telefone?: string;
}

/** Remove duplicados e horários fora do expediente, mantendo a ordem do dia. */
export function blocosValidos(lista: readonly string[] | undefined): string[] {
  if (!lista) return [];
  const escolhidos = new Set(lista.map((h) => h.trim()));
  return HORARIOS.filter((h) => escolhidos.has(h));
}

/** Descarta participantes sem nome e marca o primeiro como principal. */
export function normalizarParticipantes(
  participantes: readonly ParticipanteInput[] | undefined,
): { nome: string; telefone: string | null; principal: boolean }[] {
  if (!participantes) return [];
  return participantes
    .filter((p) => p.nome.trim() !== '')
    .map((p, i) => ({
      nome: p.nome.trim(),
      telefone: p.telefone?.trim() || null,
      principal: i === 0,
    }));
}
