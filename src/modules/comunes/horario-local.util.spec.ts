import {
  fechaLocal,
  horarioLocal,
  inicioDelDia,
  inicioDelDiaSiguiente,
} from './horario-local.util.js';

describe('horario-local.util', () => {
  it('convierte un instante a la fecha y la hora de Tucumán (UTC-3)', () => {
    const instante = new Date('2026-11-20T22:20:00.000Z');

    expect(fechaLocal(instante)).toBe('2026-11-20');
    expect(horarioLocal(instante)).toBe('19:20');
  });

  it('una función de la noche cae en el día local anterior al de UTC', () => {
    const instante = new Date('2026-11-21T01:30:00.000Z');

    expect(fechaLocal(instante)).toBe('2026-11-20');
    expect(horarioLocal(instante)).toBe('22:30');
  });

  it('el día local empieza a las 03:00 UTC y dura 24 horas', () => {
    expect(inicioDelDia('2026-11-20').toISOString()).toBe(
      '2026-11-20T03:00:00.000Z',
    );
    expect(inicioDelDiaSiguiente('2026-11-20').toISOString()).toBe(
      '2026-11-21T03:00:00.000Z',
    );
  });
});
