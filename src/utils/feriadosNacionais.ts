/**
 * Feriados nacionais usados na contagem dos 10 dias úteis do alerta do KRI.
 *
 * Espelho da semente de `public.feriados` (migração 20261123002_lac03_alerta_kri.sql);
 * um teste confere que as datas são as mesmas. Datas em ISO (aaaa-mm-dd).
 *
 * ATENÇÃO: cobre só 2026 e 2027, como o banco. A partir de 2028 a CGOV precisa
 * cadastrar os feriados no banco (e esta lista deve ser atualizada); sem isso,
 * feriado conta como dia útil.
 */
export const FERIADOS_NACIONAIS: readonly string[] = [
  '2026-01-01', // Confraternização Universal
  '2026-02-16', // Carnaval (segunda-feira)
  '2026-02-17', // Carnaval (terça-feira)
  '2026-04-03', // Sexta-feira da Paixão
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-09-07', // Independência do Brasil
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-15', // Proclamação da República
  '2026-11-20', // Dia da Consciência Negra
  '2026-12-25', // Natal
  '2027-01-01', // Confraternização Universal
  '2027-02-08', // Carnaval (segunda-feira)
  '2027-02-09', // Carnaval (terça-feira)
  '2027-03-26', // Sexta-feira da Paixão
  '2027-04-21', // Tiradentes
  '2027-05-01', // Dia do Trabalho
  '2027-05-27', // Corpus Christi
  '2027-09-07', // Independência do Brasil
  '2027-10-12', // Nossa Senhora Aparecida
  '2027-11-02', // Finados
  '2027-11-15', // Proclamação da República
  '2027-11-20', // Dia da Consciência Negra
  '2027-12-25', // Natal
];
