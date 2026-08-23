/**
 * Utilidades de Formato y Manejo de Moneda Colombiana (COP)
 */

export const formatCOP = (val: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(val);
};

export const formatNumberWithDots = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(/,/g, '')) : val;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  }).format(num);
};

export const parseCOPInput = (val: string): number => {
  if (!val) return 0;
  // Elimina puntos de miles, símbolos $ y espacios
  const clean = val.replace(/\$/g, '').replace(/\./g, '').replace(/\s/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};
