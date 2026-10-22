import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  Database,
  Sparkles
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { reportsRepository } from '../../../repositories/reportsRepository';
import { formatCOP } from '../../../utils/currency';
import { buildReportDateRange, formatLocalDateTime, getLocalDateString } from '../../../utils/date';
import { exportReportToExcel, exportReportToPDF } from '../../../utils/reportExporters';
import type { PeriodReportData, ReportExportFormat, ReportPreset } from '../../../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

const PRESET_OPTIONS: Array<{ id: ReportPreset; label: string; description: string }> = [
  { id: '24h', label: 'Últimas 24H', description: 'Ventana exacta de las últimas 24 horas' },
  { id: '3d', label: 'Últimos 3 días', description: 'Hoy y los 2 días anteriores completos' },
  { id: '7d', label: 'Última semana', description: 'Consolidado de los últimos 7 días' },
  { id: '30d', label: 'Último mes', description: 'Consolidado de los últimos 30 días' },
  { id: 'custom', label: 'Rango de fechas', description: 'Elige fecha inicial y final personalizada' }
];

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  initialDate
}) => {
  const todayStr = getLocalDateString();
  const [preset, setPreset] = useState<ReportPreset>('24h');
  const [customStart, setCustomStart] = useState<string>(initialDate || todayStr);
  const [customEnd, setCustomEnd] = useState<string>(initialDate || todayStr);
  const [reportData, setReportData] = useState<PeriodReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<ReportExportFormat | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const activeRange = useMemo(
    () => buildReportDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  useEffect(() => {
    if (!isOpen) {
      setExportFeedback(null);
      return;
    }

    let isMounted = true;
    const loadPeriodPreview = async () => {
      setIsLoading(true);
      try {
        const data = await reportsRepository.getPeriodReportData(activeRange);
        if (isMounted) {
          setReportData(data);
        }
      } catch (err) {
        console.error('Error preparando datos del reporte:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPeriodPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeRange]);

  const handleDownload = async (format: ReportExportFormat) => {
    setIsExporting(format);
    setExportFeedback(null);
    try {
      const freshData = await reportsRepository.getPeriodReportData(activeRange);
      setReportData(freshData);
      if (format === 'excel') {
        exportReportToExcel(freshData);
        setExportFeedback('Archivo Excel (.xlsx) descargado correctamente.');
      } else {
        exportReportToPDF(freshData);
        setExportFeedback('Reporte PDF (.pdf) descargado correctamente.');
      }
    } catch (err) {
      console.error('Error exportando reporte:', err);
      setExportFeedback('Ocurrió un error al generar el archivo. Intenta nuevamente.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadJsonBackup = async () => {
    const backup = await reportsRepository.getFullDatabaseBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jevacris-respaldo-completo-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportFeedback('Copia de seguridad completa (.json) descargada.');
  };

  const isCustomInvalid = preset === 'custom' && (!customStart || !customEnd || customStart > customEnd);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Reporte de Operación"
      subtitle="Descarga el balance de ventas, ganancias, arqueos, cajas y fiados en formato Excel o PDF"
      maxWidth="640px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ===================================================================== */}
        {/* 1. Selector de Período Rápido o Rango Personalizado                   */}
        {/* ===================================================================== */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            1. SELECCIONA EL PERÍODO DEL REPORTE
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
              gap: '8px'
            }}
          >
            {PRESET_OPTIONS.map((opt) => {
              const isSelected = preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPreset(opt.id);
                    setExportFeedback(null);
                  }}
                  style={{
                    padding: '12px 10px',
                    borderRadius: '18px',
                    border: isSelected ? '1.5px solid #310344' : '1px solid #e6e0eb',
                    backgroundColor: isSelected ? '#310344' : '#f8f1fd',
                    color: isSelected ? '#ffffff' : '#1d1a22',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    textAlign: 'center',
                    boxShadow: isSelected ? '0 6px 16px rgba(49, 3, 68, 0.18)' : 'none'
                  }}
                >
                  {opt.id === '24h' ? (
                    <Clock size={15} color={isSelected ? '#f8d8ff' : '#7a4c8c'} />
                  ) : (
                    <Calendar size={15} color={isSelected ? '#f8d8ff' : '#7a4c8c'} />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 2. Selector de Fechas Personalizado (Desde / Hasta)                   */}
        {/* ===================================================================== */}
        {preset === 'custom' && (
          <div
            style={{
              backgroundColor: '#f8f1fd',
              borderRadius: '24px',
              padding: '18px 20px',
              border: '1px solid #ece6f1',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#310344',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}
              >
                FECHA INICIAL (DESDE)
              </label>
              <input
                type="date"
                value={customStart}
                max={customEnd || todayStr}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  if (customEnd && e.target.value > customEnd) {
                    setCustomEnd(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '16px',
                  border: '1px solid #cfc3cf',
                  padding: '0 14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#310344',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}
              >
                FECHA FINAL (HASTA)
              </label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '16px',
                  border: '1px solid #cfc3cf',
                  padding: '0 14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1d1a22',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* 3. Vista Previa en Vivo del Período Seleccionado                      */}
        {/* ===================================================================== */}
        <div
          style={{
            backgroundColor: '#fdf7ff',
            borderRadius: '28px',
            padding: '20px 24px',
            border: '1px solid #ece6f1',
            boxShadow: '0 8px 24px rgba(49, 3, 68, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#7a4c8c" />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#310344',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                Vista previa: {activeRange.label}
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: '#7e747f', fontWeight: 500 }}>
              {formatLocalDateTime(activeRange.startIso)} → {formatLocalDateTime(activeRange.endIso)}
            </span>
          </div>

          {isLoading || !reportData ? (
            <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '13px', color: '#7e747f' }}>
              Calculando consolidado del período...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '18px',
                    border: '1px solid #f2ecf7'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#7e747f',
                      textTransform: 'uppercase'
                    }}
                  >
                    Ventas Totales
                  </div>
                  <div
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      color: '#310344',
                      marginTop: '4px',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatCOP(reportData.summary.totalSales)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '18px',
                    border: '1px solid #f2ecf7'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#7e747f',
                      textTransform: 'uppercase'
                    }}
                  >
                    Ganancia Total
                  </div>
                  <div
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      color: '#1d1a22',
                      marginTop: '4px',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatCOP(reportData.summary.totalProfit)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '18px',
                    border: '1px solid #f2ecf7'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#995c00',
                      textTransform: 'uppercase'
                    }}
                  >
                    Fiados (Salida)
                  </div>
                  <div
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      color: '#1d1a22',
                      marginTop: '4px',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatCOP(reportData.summary.debtsGivenAmount || 0)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '18px',
                    border: '1px solid #f2ecf7'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#310344',
                      textTransform: 'uppercase'
                    }}
                  >
                    Cartera por Cobrar
                  </div>
                  <div
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      color: '#310344',
                      marginTop: '4px',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatCOP(reportData.summary.totalActiveReceivables || 0)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#4d444e',
                  paddingTop: '4px'
                }}
              >
                <span>
                  Efectivo: <strong>{formatCOP(reportData.summary.cashSales)}</strong>
                </span>
                <span>
                  Transferencias: <strong>{formatCOP(reportData.summary.transferSales)}</strong>
                </span>
                <span>
                  Abonos Recaudados:{' '}
                  <strong>{formatCOP(reportData.summary.debtPaymentsCollected || 0)}</strong>
                </span>
              </div>
            </>
          )}
        </div>

        {/* ===================================================================== */}
        {/* 4. Botones de Descarga Directa (Excel .xlsx / PDF .pdf)               */}
        {/* ===================================================================== */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#4d444e',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            2. ELIGE EL FORMATO DE DESCARGA
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px'
            }}
          >
            {/* Botón Excel */}
            <button
              type="button"
              disabled={isLoading || isCustomInvalid || isExporting !== null}
              onClick={() => handleDownload('excel')}
              style={{
                padding: '16px 20px',
                borderRadius: '22px',
                border: '1.5px solid #310344',
                backgroundColor: '#310344',
                color: '#ffffff',
                cursor: isLoading || isCustomInvalid ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textAlign: 'left',
                boxShadow: '0 8px 20px rgba(49, 3, 68, 0.2)',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
                opacity: isLoading || isCustomInvalid ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(248, 216, 255, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f8d8ff',
                    flexShrink: 0
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    {isExporting === 'excel' ? 'Generando Excel...' : 'Descargar Excel (.xlsx)'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#eab3fc', marginTop: '2px' }}>
                    6 hojas: Resumen, Ventas, Días, Productos, Caja y Fiados
                  </div>
                </div>
              </div>
              <Download size={18} color="#f8d8ff" />
            </button>

            {/* Botón PDF */}
            <button
              type="button"
              disabled={isLoading || isCustomInvalid || isExporting !== null}
              onClick={() => handleDownload('pdf')}
              style={{
                padding: '16px 20px',
                borderRadius: '22px',
                border: '1.5px solid #cfc3cf',
                backgroundColor: '#ffffff',
                color: '#1d1a22',
                cursor: isLoading || isCustomInvalid ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textAlign: 'left',
                boxShadow: '0 4px 14px rgba(49, 3, 68, 0.06)',
                transition: 'all 0.15s ease',
                opacity: isLoading || isCustomInvalid ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '14px',
                    backgroundColor: '#f8f1fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#310344',
                    flexShrink: 0
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#310344' }}>
                    {isExporting === 'pdf' ? 'Generando PDF...' : 'Descargar PDF (.pdf)'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#7e747f', marginTop: '2px' }}>
                    Documento ejecutivo listo para imprimir o compartir
                  </div>
                </div>
              </div>
              <Download size={18} color="#310344" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* Feedback de descarga exitosa                                          */}
        {/* ===================================================================== */}
        {exportFeedback && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '16px',
              backgroundColor: '#eef7ee',
              border: '1px solid rgba(30, 126, 52, 0.25)',
              color: '#1e7e34',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={18} />
            <span>{exportFeedback}</span>
          </div>
        )}

        {/* ===================================================================== */}
        {/* Pie: Respaldo JSON Completo (MOD-05) y Botón Cerrar                   */}
        {/* ===================================================================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #ece6f1'
          }}
        >
          <button
            type="button"
            onClick={handleDownloadJsonBackup}
            style={{
              background: 'none',
              border: 'none',
              color: '#6d5773',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              borderRadius: '10px'
            }}
            title="Descargar copia de seguridad técnica de toda la base de datos en JSON"
          >
            <Database size={14} />
            <span>Descargar copia de seguridad completa (.json)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              backgroundColor: '#f2ecf7',
              border: 'none',
              color: '#310344',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
