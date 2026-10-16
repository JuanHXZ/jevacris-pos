/**
 * Utilidades para manejo de fechas y zonas horarias locales (Colombia UTC-5)
 */

/**
 * Devuelve la fecha local del dispositivo en formato 'YYYY-MM-DD'
 * evitando el desfase de toISOString() que usa UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte cualquier fecha (ISO string o Date) a su fecha local 'YYYY-MM-DD'
 * según la zona horaria del usuario/dispositivo.
 */
export function toLocalDateString(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return '';
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return '';
  return getLocalDateString(d);
}

/**
 * Formatea una fecha ISO para mostrar la hora local am/pm (ej: 7:27 p. m.)
 */
export function formatLocalTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
}

export function formatLocalDateTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const datePart = getLocalDateString(d);
    const timePart = formatLocalTime(isoString);
    return `${datePart} ${timePart}`.trim();
  } catch {
    return '';
  }
}

/**
 * Construye un rango de fechas/timestamps exacto según el preset o fechas personalizadas.
 */
export function buildReportDateRange(
  preset: import('../types').ReportPreset,
  customStartDateStr?: string,
  customEndDateStr?: string,
  now: Date = new Date()
): import('../types').ReportDateRange {
  if (preset === '24h') {
    const end = new Date(now.getTime());
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startDateStr = getLocalDateString(start);
    const endDateStr = getLocalDateString(end);
    return {
      preset,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      startDateStr,
      endDateStr,
      label: 'Últimas 24 horas'
    };
  }

  if (preset === 'custom') {
    const fallbackToday = getLocalDateString(now);
    const rawStart = customStartDateStr || fallbackToday;
    const rawEnd = customEndDateStr || rawStart;
    const [orderedStart, orderedEnd] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart];

    const [sy, sm, sd] = orderedStart.split('-').map(Number);
    const [ey, em, ed] = orderedEnd.split('-').map(Number);

    const start = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0);
    const end = new Date(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999);

    return {
      preset,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      startDateStr: orderedStart,
      endDateStr: orderedEnd,
      label: orderedStart === orderedEnd ? `Día ${orderedStart}` : `Del ${orderedStart} al ${orderedEnd}`
    };
  }

  const daysBackMap: Record<'3d' | '7d' | '30d', { days: number; label: string }> = {
    '3d': { days: 3, label: 'Últimos 3 días' },
    '7d': { days: 7, label: 'Última semana (7 días)' },
    '30d': { days: 30, label: 'Último mes (30 días)' }
  };

  const config = daysBackMap[preset];
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  start.setDate(start.getDate() - (config.days - 1));

  return {
    preset,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDateStr: getLocalDateString(start),
    endDateStr: getLocalDateString(end),
    label: config.label
  };
}

/**
 * Evalúa si un timestamp ISO se encuentra dentro del rango [startIso, endIso] inclusive.
 */
export function isIsoWithinRange(isoString: string | undefined | null, startIso: string, endIso: string): boolean {
  if (!isoString) return false;
  const time = new Date(isoString).getTime();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(time) || isNaN(start) || isNaN(end)) return false;
  return time >= start && time <= end;
}

/**
 * Evalúa si una fecha local 'YYYY-MM-DD' se encuentra dentro de [startDateStr, endDateStr] inclusive.
 */
export function isDateStrWithinRange(
  dateStr: string | undefined | null,
  startDateStr: string,
  endDateStr: string
): boolean {
  if (!dateStr) return false;
  return dateStr >= startDateStr && dateStr <= endDateStr;
}

/**
 * Genera la lista de fechas 'YYYY-MM-DD' consecutivas entre startDateStr y endDateStr inclusive.
 */
export function enumerateDateStringsBetween(startDateStr: string, endDateStr: string): string[] {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const current = new Date(sy, (sm || 1) - 1, sd || 1, 12, 0, 0, 0);
  const end = new Date(ey, (em || 1) - 1, ed || 1, 12, 0, 0, 0);

  if (isNaN(current.getTime()) || isNaN(end.getTime()) || current > end) {
    return [startDateStr];
  }

  const dates: string[] = [];
  while (current <= end) {
    dates.push(getLocalDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}


