import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppShell, type TabId } from './components/layout/AppShell';
import { PosView } from './features/pos/PosView';
import { InventoryView } from './features/inventory/InventoryView';
import { StockView } from './features/stock/StockView';
import { ReportsView } from './features/reports/ReportsView';
import { CashView } from './features/cash/CashView';
import { DebtsView } from './features/debts/DebtsView';
import { db, seedInitialDataIfNeeded } from './db';
import { syncEngine } from './sync/syncEngine';
import { usePinLock } from './hooks/usePinLock';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { PinSettingsModal } from './components/auth/PinSettingsModal';
import { CashSessionModal } from './features/cash/components/CashSessionModal';
import { CashOpeningView } from './features/cash/CashOpeningView';
import { CashClosingView } from './features/cash/CashClosingView';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('pos');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const openCashSession = useLiveQuery(
    async () => (await db.cashSessions.filter((session) => session.status === 'open').first()) ?? null,
    []
  );

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
        hasOpenCashSession={Boolean(openCashSession)}
        onCloseCashSession={() => setActiveTab('cash-shifts')}
      >
        {activeTab === 'pos' && (
          <PosView
            onGoToCashShifts={() => setActiveTab('cash-shifts')}
            onGoToDebts={() => setActiveTab('debts')}
          />
        )}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'stock' && <StockView />}
        {activeTab === 'debts' && <DebtsView onGoToCashShifts={() => setActiveTab('cash-shifts')} />}
        {activeTab === 'cash-shifts' && (
          openCashSession ? (
            <CashClosingView
              onCloseSuccess={() => setActiveTab('pos')}
              onGoToSales={() => setActiveTab('pos')}
            />
          ) : (
            <CashOpeningView
              onOpenSuccess={() => setActiveTab('pos')}
              onCancel={() => setActiveTab('pos')}
              onGoToSales={() => setActiveTab('pos')}
            />
          )
        )}
        {activeTab === 'cash' && <CashView />}
        {activeTab === 'reports' && (
          <ReportsView
            onGoToCash={() => setActiveTab('cash')}
            onGoToDebts={() => setActiveTab('debts')}
          />
        )}
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

      <CashSessionModal
        isOpen={
          !isInitializing &&
          openCashSession === null &&
          activeTab === 'pos' &&
          !(isPinConfigured && isLocked)
        }
        onClose={() => undefined}
        initialMode="open"
        isDismissible={false}
        preserveSidebar={true}
        onNavigateToCashShifts={() => setActiveTab('cash-shifts')}
      />
    </>
  );
}

export default App;
