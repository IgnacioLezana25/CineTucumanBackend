const DESPLAZAMIENTO_MS = 3 * 60 * 60 * 1000;
const DESPLAZAMIENTO_TEXTO = '-03:00';
const DIA_MS = 24 * 60 * 60 * 1000;

export function fechaLocal(instante: Date): string {
  return new Date(instante.getTime() - DESPLAZAMIENTO_MS)
    .toISOString()
    .slice(0, 10);
}

export function horarioLocal(instante: Date): string {
  return new Date(instante.getTime() - DESPLAZAMIENTO_MS)
    .toISOString()
    .slice(11, 16);
}

export function inicioDelDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00${DESPLAZAMIENTO_TEXTO}`);
}

export function inicioDelDiaSiguiente(fecha: string): Date {
  return new Date(inicioDelDia(fecha).getTime() + DIA_MS);
}
