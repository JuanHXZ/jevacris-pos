import React from 'react';
import {
  Calendar,
  Clock,
  Phone,
  Package,
  Banknote,
  Smartphone,
  CheckCircle2,
  FileText,
  History
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { formatCOP, formatNumberWithDots } from '../../../utils/currency';
import { formatLocalDateTime } from '../../../utils/date';
import type { DebtWithDetails } from '../../../types';

interface DebtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtWithDetails | null;
  onOpenPayment?: (debt: DebtWithDetails) => void;
}

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  isOpen,
  onClose,
  debt,
  onOpenPayment
}) => {
  if (!debt) return null;

  const progressPercent =
    debt.totalAmount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Expediente de Fiado ${debt.folio}`}
      subtitle={`Cliente: ${debt.debtorName} • Entregado: ${formatLocalDateTime(debt.createdAt)}`}
      maxWidth="640px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Resumen Financiero y Barra de Progreso */}
        <div
          style={{
            backgroundColor: '#f8f1fd',
            borderRadius: '24px',
            padding: '20px',
            border: '1px solid rgba(207, 195, 207, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid #ece6f1'
              }}
            >
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#6d5773', textTransform: 'uppercase' }}>
                Deuda Inicial
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
                {formatCOP(debt.totalAmount)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid #ece6f1'
              }}
            >
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#6d5773', textTransform: 'uppercase' }}>
                Total Abonado ({progressPercent}%)
              </div>
              <div
                style={{
                  fontSize: '19px',
                  fontWeight: 700,
                  color: '#1e7e34',
                  marginTop: '4px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {formatCOP(debt.paidAmount)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: debt.remainingAmount > 0 ? '#310344' : '#eef7ee',
                padding: '12px 14px',
                borderRadius: '16px'
              }}
            >
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: debt.remainingAmount > 0 ? '#f6d9fb' : '#1e7e34',
                  textTransform: 'uppercase'
                }}
              >
                Saldo Pendiente
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: debt.remainingAmount > 0 ? '#ffffff' : '#1e7e34',
                  marginTop: '4px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {formatCOP(debt.remainingAmount)}
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '999px',
                backgroundColor: '#e6e0eb',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  borderRadius: '999px',
                  backgroundColor: debt.status === 'paid' ? '#1e7e34' : '#310344',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px',
                color: '#6d5773'
              }}
            >
              {debt.debtorPhone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} /> Tel: <strong>{debt.debtorPhone}</strong>
                </span>
              )}
              {debt.dueDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Fecha pactada: <strong>{debt.dueDate}</strong>
                </span>
              )}
              {debt.paidAt && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1e7e34' }}>
                  <CheckCircle2 size={13} /> Saldado el {formatLocalDateTime(debt.paidAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desglose de Productos / Servicios Entregados */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#310344',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            <Package size={15} />
            <span>Mercancía y Servicios Entregados ({debt.items.length} ítems)</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}
          >
            {debt.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  backgroundColor: '#f2ecf7',
                  fontSize: '13.5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    style={{
                      backgroundColor: '#310344',
                      color: '#f6d9fb',
                      fontWeight: 700,
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.quantity} {item.unit}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#1d1a22',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.productName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6d5773' }}>
                      {item.productType === 'service' ? 'Servicio / Recarga' : 'Producto Físico (Stock descontado)'} • $
                      {formatNumberWithDots(item.unitPrice)} c/u
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontWeight: 700,
                    color: '#310344',
                    fontVariantNumeric: 'tabular-nums',
                    marginLeft: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatCOP(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Historial de Abonos y Pagos */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#310344',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            <History size={15} />
            <span>Historial de Abonos y Pagos ({debt.payments.length})</span>
          </div>

          {debt.payments.length === 0 ? (
            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: '#f8f1fd',
                color: '#6d5773',
                fontSize: '13px',
                textAlign: 'center',
                border: '1px dashed #cfc3cf'
              }}
            >
              Aún no se han registrado abonos para este fiado.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '190px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {debt.payments.map((pay) => {
                const isCash = pay.paymentMethod === 'cash';
                return (
                  <div
                    key={pay.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #ece6f1',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={13} color="#7a4c8c" />
                        <span style={{ fontWeight: 600, color: '#1d1a22' }}>
                          {formatLocalDateTime(pay.paidAt)}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: isCash ? '#eef7ee' : '#f0ebff',
                            color: isCash ? '#1e7e34' : '#5b21b6'
                          }}
                        >
                          {isCash ? <Banknote size={11} /> : <Smartphone size={11} />}
                          {isCash ? 'Efectivo' : 'Nequi / Transf.'}
                        </span>
                      </div>
                      {pay.notes && (
                        <div style={{ fontSize: '11.5px', color: '#6d5773', marginLeft: '21px' }}>
                          Nota: {pay.notes}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#1e7e34',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      + {formatCOP(pay.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notas del Fiado */}
        {debt.notes && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              backgroundColor: '#f8f1fd',
              fontSize: '12.5px',
              color: '#4d444e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}
          >
            <FileText size={15} color="#6d5773" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Nota / Compromiso:</strong> {debt.notes}
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '8px',
            borderTop: '1px solid #ece6f1'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 20px',
              borderRadius: '999px',
              border: '1px solid #cfc3cf',
              backgroundColor: '#f2ecf7',
              color: '#310344',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>

          {debt.status !== 'paid' && debt.remainingAmount > 0 && onOpenPayment && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPayment(debt);
              }}
              style={{
                padding: '11px 22px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#310344',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(49, 3, 68, 0.2)'
              }}
            >
              Registrar Abono / Cobrar
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
