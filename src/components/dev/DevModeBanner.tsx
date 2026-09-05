import React, { useState } from 'react';
import { Terminal, RotateCcw, LogOut } from 'lucide-react';
import { setDevMode, resetDevDatabase } from '../../db';

export const DevModeBanner: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    const confirmed = window.confirm(
      '¿Deseas reiniciar la base de datos de prueba?\n\nSe vaciarán las ventas y modificaciones del Sandbox y se restaurarán los productos de prueba iniciales. Tu base de datos de producción real NO será afectada.'
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      await resetDevDatabase();
    } catch (err) {
      console.error('Error al reiniciar base de datos dev:', err);
      alert('Ocurrió un error al reiniciar los datos de prueba.');
      setIsResetting(false);
    }
  };

  const handleExitDevMode = () => {
    const confirmed = window.confirm(
      '¿Volver al Modo Producción?\n\nRegresarás a la base de datos real del negocio conectada y sincronizada con Supabase.'
    );
    if (confirmed) {
      setDevMode(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#78350f',
        backgroundImage: 'linear-gradient(90deg, #78350f 0%, #92400e 50%, #b45309 100%)',
        color: '#fef3c7',
        borderBottom: '2px solid #f59e0b',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        zIndex: 200
      }}
    >
      {/* Indicador y Contexto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            backgroundColor: 'rgba(245, 158, 11, 0.25)',
            border: '1px solid #f59e0b',
            color: '#fbbf24'
          }}
        >
          <Terminal size={15} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
              MODO DESARROLLADOR / SANDBOX ACTIVO
            </span>
            <span
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                color: '#fde68a',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              Nube Supabase Desconectada
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#fde68a', opacity: 0.9, marginTop: '1px' }}>
            Las ventas y cambios se guardan en un almacén aislado de pruebas. Ningún cliente recibirá estos datos.
          </div>
        </div>
      </div>

      {/* Acciones de Desarrollador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleResetData}
          disabled={isResetting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fef3c7',
            border: '1px solid rgba(254, 243, 199, 0.25)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'background-color 0.15s'
          }}
          title="Borrar ventas de prueba y volver al catálogo inicial de prueba"
        >
          <RotateCcw size={13} className={isResetting ? 'animate-spin' : ''} />
          <span>{isResetting ? 'Reiniciando...' : 'Reiniciar Datos de Prueba'}</span>
        </button>

        <button
          onClick={handleExitDevMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '6px',
            backgroundColor: '#f59e0b',
            color: '#78350f',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            transition: 'transform 0.1s, background-color 0.15s'
          }}
          title="Regresar a la base de datos real de producción (Atajo: Alt + D)"
        >
          <LogOut size={13} />
          <span>Volver a Producción</span>
        </button>
      </div>
    </div>
  );
};
