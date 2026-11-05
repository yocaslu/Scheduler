import { dataValida, diaUtil, formatarHorario, hoje, paraHorario } from './datas';

describe('dataValida', () => {
  it('aceita uma data que existe', () => expect(dataValida('2026-02-28')).toBe(true));
  it('aceita 29/02 em ano bissexto', () => expect(dataValida('2028-02-29')).toBe(true));
  it('recusa 30 de fevereiro', () => expect(dataValida('2026-02-30')).toBe(false));
  it('recusa formato brasileiro', () => expect(dataValida('28/02/2026')).toBe(false));
  it('recusa texto vazio', () => expect(dataValida('')).toBe(false));
});

describe('diaUtil', () => {
  it('recusa sábado', () => expect(diaUtil('2026-11-07')).toBe(false));
  it('recusa domingo', () => expect(diaUtil('2026-11-08')).toBe(false));
  it('aceita segunda-feira', () => expect(diaUtil('2026-11-09')).toBe(true));
});

describe('hoje', () => {
  it('usa o fuso de São Paulo', () => {
    // 02:00 UTC do dia 6 ainda é dia 5 em São Paulo (UTC-3).
    expect(hoje(new Date('2026-11-06T02:00:00Z'))).toBe('2026-11-05');
  });
});

describe('paraHorario / formatarHorario', () => {
  it('faz o caminho de ida e volta', () => {
    expect(formatarHorario(paraHorario('2026-11-09', '09:30'))).toBe('09:30');
  });
});
