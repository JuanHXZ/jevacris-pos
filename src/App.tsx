import { useState, useEffect } from 'react';
import { AppShell, type TabId } from './components/layout/AppShell';
import { PosView } from './features/pos/PosView';
import { InventoryView } from './features/inventory/InventoryView';
import { StockView } from './features/stock/StockView';
import { ReportsView } from './features/reports/ReportsView';
import { seedInitialDataIfNeeded } from './db';
import { syncEngine } from './sync/syncEngine';
import { usePinLock } from './hooks/usePinLock';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { PinSettingsModal } from './components/auth/PinSettingsModal';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('pos');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const {
    isPinConfigured,
    isLocked,
    autoLockMinutes,
    lock,
    unlock,
    setupPin,
    changePin,
    disablePin,
    updateAutoLockMinutes
  } = usePinLock();

  useEffect(() => {
    const initApp = async () => {
      try {
        await seedInitialDataIfNeeded();
        // Iniciar sincronización periódica con Supabase
        syncEngine.startPeriodicSync(30000);
      } catch (err) {
        console.error('Error inicializando app:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();

    return () => {
      syncEngine.stopPeriodicSync();
    };
  }, []);

  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-app)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: 'var(--text-primary)'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: 'var(--shadow-glow-brand)'
          }}
        >
          J
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Iniciando JEVACRIS POS...</div>
      </div>
    );
  }

  // Pantalla de bloqueo si el PIN está configurado y la terminal está bloqueada
  if (isPinConfigured && isLocked) {
    return <PinLockScreen onUnlock={unlock} />;
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isPinConfigured={isPinConfigured}
        onLock={lock}
        onOpenPinSettings={() => setIsPinModalOpen(true)}
      >
        {activeTab === 'pos' && <PosView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'stock' && <StockView />}
        {activeTab === 'reports' && <ReportsView />}
      </AppShell>

      {/* Modal de Configuración y Seguridad de PIN */}
      <PinSettingsModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        isPinConfigured={isPinConfigured}
        autoLockMinutes={autoLockMinutes}
        onSetupPin={setupPin}
        onChangePin={changePin}
        onDisablePin={disablePin}
        onUpdateAutoLock={updateAutoLockMinutes}
      />
    </>
  );
}

export default App;
