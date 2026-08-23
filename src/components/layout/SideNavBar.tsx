import React from 'react';
import {
  ShoppingCart,
  Package,
  ArrowDownToLine,
  BarChart3,
  Plus,
  Settings
} from 'lucide-react';
import { TabId } from './AppShell';

interface SideNavBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onNewSale?: () => void;
  onOpenSettings?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  activeTab,
  onTabChange,
  onNewSale,
  onOpenSettings
}) => {
  const navItems = [
    {
      id: 'pos' as TabId,
      label: 'Punto de Venta',
      icon: ShoppingCart
    },
    {
      id: 'inventory' as TabId,
      label: 'Inventario',
      icon: Package
    },
    {
      id: 'stock' as TabId,
      label: 'Entradas de Stock',
      icon: ArrowDownToLine
    },
    {
      id: 'reports' as TabId,
      label: 'Reportes',
      icon: BarChart3
    }
  ];

  return (
    <aside
      className="desktop-sidebar"
      style={{
        width: '288px',
        minWidth: '288px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: '#f8f1fd',
        borderRight: '1px solid rgba(207, 195, 207, 0.3)',
        boxShadow: '24px 0px 24px rgba(49, 3, 68, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 24px',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: 50
      }}
    >
      {/* Brand Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '36px',
            fontWeight: 700,
            letterSpacing: '-1.2px',
            lineHeight: 1.1,
            color: '#010001',
            fontFamily: 'var(--font-sans)'
          }}
        >
          JEVACRIS
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            fontWeight: 400,
            color: '#4d444e',
            lineHeight: '21px',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Limpieza de Lujo
        </p>
      </div>

      {/* Navigation Links */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 18px',
                borderRadius: '48px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: isActive ? '#310344' : 'transparent',
                color: isActive ? '#f6d9fb' : '#4d444e',
                boxShadow: isActive ? '0px 2px 8px rgba(49, 3, 68, 0.15)' : 'none',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f2ecf7';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? '#f6d9fb' : '#4d444e'}
              />
              <span
                style={{
                  fontSize: '17px',
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '-0.2px',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer / CTA Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: 'auto',
          paddingTop: '24px'
        }}
      >
        {/* Nueva Venta CTA Button */}
        <button
          onClick={onNewSale || (() => onTabChange('pos'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            height: '56px',
            backgroundColor: '#310344',
            color: '#f6d9fb',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '17px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0px 8px 16px rgba(49, 3, 68, 0.18)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            fontFamily: 'var(--font-sans)'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0px 10px 20px rgba(49, 3, 68, 0.25)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0px 8px 16px rgba(49, 3, 68, 0.18)')}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nueva Venta</span>
        </button>

        {/* Ajustes Button */}
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 18px',
            borderRadius: '48px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#4d444e',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f2ecf7')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Settings size={20} strokeWidth={2} color="#4d444e" />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)'
            }}
          >
            Ajustes
          </span>
        </button>
      </div>
    </aside>
  );
};
