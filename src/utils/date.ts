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

