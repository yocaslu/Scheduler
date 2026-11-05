import { blocosValidos, normalizarParticipantes } from './horarios';

describe('blocosValidos', () => {
  it('remove duplicados e horários fora do expediente, na ordem do dia', () => {
    expect(blocosValidos(['10:00', '09:30', '10:00', '03:17', '12:00'])).toEqual([
      '09:30',
      '10:00',
    ]);
  });

  it('retorna lista vazia sem entrada', () => expect(blocosValidos(undefined)).toEqual([]));
});

describe('normalizarParticipantes', () => {
  it('descarta nomes vazios e marca só o primeiro como principal', () => {
    expect(
      normalizarParticipantes([
        { nome: '  Ana ', telefone: ' 1199 ' },
        { nome: '   ' },
        { nome: 'Bia' },
      ]),
    ).toEqual([
      { nome: 'Ana', telefone: '1199', principal: true },
      { nome: 'Bia', telefone: null, principal: false },
    ]);
  });
});
