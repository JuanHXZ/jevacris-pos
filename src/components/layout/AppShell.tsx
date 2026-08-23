import React from 'react';
import { ShoppingCart, Package, ArrowDownToLine, BarChart3, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useSync } from '../../hooks/useSync';

export type TabId = 'pos' | 'inventory' | 'stock' | 'reports';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  children
}) => {
  const { status, lastSyncedAt, triggerSync, isSyncing } = useSync();

  const navItems = [
    { id: 'pos' as TabId, label: 'Venta Rápida', icon: ShoppingCart },
    { id: 'inventory' as TabId, label: 'Inventario', icon: Package },
    { id: 'stock' as TabId, label: 'Entradas', icon: ArrowDownToLine },
    { id: 'reports' as TabId, label: 'Caja & Reportes', icon: BarChart3 }
  ];

  const getSyncBadge = () => {
    switch (status) {
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
      {/* Top Header */}
      <header
        style={{
          height: '60px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow-brand)'
            }}
          >
            J
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
              JEVACRIS <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '14px' }}>POS</span>
            </h1>
          </div>
        </div>

        {/* Sync Status Button & Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
              cursor: 'pointer'
            }}
            title="Click para sincronizar ahora con Supabase"
          >
            {badge.icon}
            <span>{badge.label}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar Navigation */}
        <aside
          style={{
            width: '240px',
            backgroundColor: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
          className="desktop-sidebar"
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
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

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
