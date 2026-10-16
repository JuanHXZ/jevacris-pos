import { describe, it, expect } from 'vitest';
import {
  buildReportDateRange,
  enumerateDateStringsBetween,
  isDateStrWithinRange,
  isIsoWithinRange
} from '../date';

describe('Utilidades de Rango de Fechas para Reportes (date.ts)', () => {
  const fixedNow = new Date(2026, 9, 16, 14, 30, 0, 0); // 2026-10-16 14:30:00 local

  it('calcula exactamente la ventana de últimas 24 horas (24h)', () => {
    const range = buildReportDateRange('24h', undefined, undefined, fixedNow);
    expect(range.preset).toBe('24h');
    expect(range.endIso).toBe(fixedNow.toISOString());

    const diffMs = new Date(range.endIso).getTime() - new Date(range.startIso).getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
    expect(range.startDateStr).toBe('2026-10-15');
    expect(range.endDateStr).toBe('2026-10-16');
  });

  it('calcula los últimos 3 días calendario completos incluyendo hoy (3d)', () => {
    const range = buildReportDateRange('3d', undefined, undefined, fixedNow);
    expect(range.preset).toBe('3d');
    expect(range.startDateStr).toBe('2026-10-14');
    expect(range.endDateStr).toBe('2026-10-16');

    const startLocal = new Date(range.startIso);
    const endLocal = new Date(range.endIso);
    expect(startLocal.getHours()).toBe(0);
    expect(startLocal.getMinutes()).toBe(0);
    expect(endLocal.getHours()).toBe(23);
    expect(endLocal.getMinutes()).toBe(59);
  });

  it('calcula la última semana (7d) y el último mes (30d)', () => {
    const weekRange = buildReportDateRange('7d', undefined, undefined, fixedNow);
    expect(weekRange.startDateStr).toBe('2026-10-10');
    expect(weekRange.endDateStr).toBe('2026-10-16');

    const monthRange = buildReportDateRange('30d', undefined, undefined, fixedNow);
    expect(monthRange.startDateStr).toBe('2026-09-17');
    expect(monthRange.endDateStr).toBe('2026-10-16');
  });

  it('construye un rango personalizado y corrige el orden si inicio > fin', () => {
    const customRange = buildReportDateRange('custom', '2026-10-05', '2026-10-01', fixedNow);
    expect(customRange.startDateStr).toBe('2026-10-01');
    expect(customRange.endDateStr).toBe('2026-10-05');
    expect(customRange.label).toBe('Del 2026-10-01 al 2026-10-05');
  });

  it('evalúa correctamente isIsoWithinRange e isDateStrWithinRange', () => {
    const range = buildReportDateRange('3d', undefined, undefined, fixedNow);
    const insideIso = new Date(2026, 9, 15, 10, 0, 0).toISOString();
    const outsideIso = new Date(2026, 9, 10, 10, 0, 0).toISOString();

    expect(isIsoWithinRange(insideIso, range.startIso, range.endIso)).toBe(true);
    expect(isIsoWithinRange(outsideIso, range.startIso, range.endIso)).toBe(false);

    expect(isDateStrWithinRange('2026-10-14', range.startDateStr, range.endDateStr)).toBe(true);
    expect(isDateStrWithinRange('2026-10-13', range.startDateStr, range.endDateStr)).toBe(false);
  });

  it('enumera todas las fechas YYYY-MM-DD dentro de un intervalo', () => {
    const dates = enumerateDateStringsBetween('2026-10-14', '2026-10-16');
    expect(dates).toEqual(['2026-10-14', '2026-10-15', '2026-10-16']);
  });
});
