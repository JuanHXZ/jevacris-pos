import React, { useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  ArrowDownToLine,
  BarChart3,
  Wallet,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Lock,
  KeyRound,
  Terminal,
  CloudOff,
  CircleDollarSign
} from 'lucide-react';
import { useSync } from '../../hooks/useSync';
import { SideNavBar } from './SideNavBar';
import { isDevMode, setDevMode } from '../../db';
import { DevModeBanner } from '../dev/DevModeBanner';

export type TabId = 'pos' | 'inventory' | 'stock' | 'cash' | 'reports';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isPinConfigured?: boolean;
  onLock?: () => void;
  onOpenPinSettings?: () => void;
  hasOpenCashSession?: boolean;
  onCloseCashSession?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  isPinConfigured = false,
  onLock,
  onOpenPinSettings,
  hasOpenCashSession = false,
  onCloseCashSession,
  children
}) => {
  const { status, lastSyncedAt, triggerSync, isSyncing } = useSync();
  const devActive = isDevMode();

  // Atajo de teclado Alt + D para alternar Modo Desarrollador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        const currentlyDev = isDevMode();
        const msg = currentlyDev
          ? '¿Deseas salir del Modo Desarrollador y volver a Producción?\n\nSe restaurará la base de datos real del negocio y la sincronización con Supabase.'
          : '¿Deseas activar el Modo Desarrollador (Sandbox)?\n\nSe usará una base de datos local aislada y se DESACTIVARÁ la sincronización con Supabase para que tus pruebas no afecten a los clientes.';
        if (window.confirm(msg)) {
          setDevMode(!currentlyDev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'pos' as TabId, label: 'Venta Rápida', icon: ShoppingCart },
    { id: 'inventory' as TabId, label: 'Inventario', icon: Package },
    { id: 'stock' as TabId, label: 'Entradas', icon: ArrowDownToLine },
    { id: 'cash' as TabId, label: 'Cajas', icon: Wallet },
    { id: 'reports' as TabId, label: 'Caja & Reportes', icon: BarChart3 }
  ];

  const getSyncBadge = () => {
    switch (status) {
      case 'unconfigured':
        return {
          icon: <CloudOff size={14} />,
          label: 'Falta Conectar Nube (Vercel)',
          bg: 'rgba(239, 68, 68, 0.12)',
          color: '#dc2626',
          border: 'rgba(239, 68, 68, 0.35)'
        };
      case 'dev_mode':
        return {
          icon: <Terminal size={14} />,
          label: 'Sandbox Dev (Sin Nube)',
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#d97706',
          border: 'rgba(245, 158, 11, 0.4)'
        };
      case 'syncing':
        return {
          icon: <RefreshCw size={14} className="animate-spin" />,
          label: 'Sincronizando...',
          bg: 'var(--brand-primary-light)',
          color: 'var(--brand-primary)',
          border: 'rgba(59, 130, 246, 0.3)'
        };
      case 'offline':
        return {
          icon: <WifiOff size={14} />,
          label: 'Offline (Guardando Local)',
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          border: 'var(--color-warning-border)'
        };
      case 'error':
        return {
          icon: <AlertCircle size={14} />,
          label: 'Error en Sync',
          bg: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          border: 'var(--color-danger-border)'
        };
      case 'synced':
      case 'idle':
      default:
        return {
          icon: <Wifi size={14} />,
          label: lastSyncedAt ? `Sincronizado (${lastSyncedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})` : 'Nube Conectada',
          bg: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          border: 'var(--color-success-border)'
        };
    }
  };

  const badge = getSyncBadge();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Banner de Modo Desarrollador Sandbox */}
      {devActive && <DevModeBanner />}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Desktop SideNavBar Component from Figma */}
        <SideNavBar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onNewSale={() => onTabChange('pos')}
          onOpenSettings={onOpenPinSettings}
        />

        {/* Main Content Area + Top Header */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Top Header */}
          <header
            style={{
              height: '64px',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '0 32px',
              position: 'sticky',
              top: 0,
              zIndex: 100
            }}
          >
            {/* Botón Alternar Modo Desarrollador */}
            {!devActive ? (
              <button
                onClick={() => {
                  const msg = '¿Deseas activar el Modo Desarrollador (Sandbox)?\n\nSe cargará una base de datos de prueba aislada y se desconectará la nube de Supabase para que ninguna venta o cambio de prueba afecte a los clientes.';
                  if (window.confirm(msg)) setDevMode(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  color: '#b45309',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Activar Modo Desarrollador para hacer pruebas aisladas (Atajo: Alt + D)"
              >
                <Terminal size={14} />
                <span>Modo Dev</span>
                <kbd
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontWeight: 700
                  }}
                >
                  Alt+D
                </kbd>
              </button>
            ) : null}

            {hasOpenCashSession && (
              <button
                onClick={onCloseCashSession}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(49, 3, 68, 0.08)',
                  color: '#310344',
                  border: '1px solid rgba(49, 3, 68, 0.22)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Cerrar la jornada y realizar el arqueo de caja"
              >
                <CircleDollarSign size={14} />
                <span>Cerrar caja</span>
              </button>
            )}

            {/* Botón Bloqueo Rápido / Configuración PIN */}
            {isPinConfigured ? (
              <button
                onClick={onLock}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--accent-danger)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Bloquear terminal inmediatamente (Atajo: Alt + L)"
              >
                <Lock size={14} />
                <span>Bloquear</span>
                <kbd
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontWeight: 700
                  }}
                >
                  Alt+L
                </kbd>
              </button>
            ) : (
              <button
                onClick={onOpenPinSettings}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-card-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer'
                }}
                title="Configurar PIN de seguridad para proteger el terminal"
              >
                <KeyRound size={14} />
                <span>Configurar PIN</span>
              </button>
            )}

            {/* Sync Status Button & Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  if (status === 'unconfigured') {
                    alert(
                      'Para activar la sincronización en Vercel necesitas agregar las variables de entorno de Supabase:\n\n' +
                      '1. Ve a tu proyecto en vercel.com > Settings > Environment Variables\n' +
                      '2. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con tus credenciales de Supabase\n' +
                      '3. Realiza un Redeploy para aplicar los cambios.'
                    );
                    return;
                  }
                  if (!devActive) triggerSync();
                }}
                disabled={isSyncing || devActive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  cursor: devActive ? 'default' : 'pointer'
                }}
                title={
                  devActive
                    ? 'Modo Desarrollador: Sincronización con Supabase deshabilitada para proteger la data de producción'
                    : status === 'unconfigured'
                    ? 'Click para ver cómo configurar Supabase en Vercel'
                    : 'Click para sincronizar ahora con Supabase'
                }
              >
                {badge.icon}
                <span>{badge.label}</span>
              </button>
            </div>
          </header>

        {/* Dynamic Page Content */}
        <main
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            paddingBottom: '80px'
          }}
        >
          {children}
        </main>
      </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '68px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
          padding: '0 8px'
        }}
        className="mobile-bottom-nav"
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '11px',
                flex: 1,
                minHeight: '48px'
              }}
            >
              <Icon size={22} color={isActive ? 'var(--brand-primary)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          main {
            padding: 12px !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
          main {
            padding-bottom: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};
