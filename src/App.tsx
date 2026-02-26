import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Onboarding } from './components/Onboarding';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Catalogs } from './components/Catalogs';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { PurchaseModal, SaleModal, ExpenseModal, ProductionModal, InventoryCountModal, AssetCountModal, CashAdjustmentModal } from './components/Operations';
import { backupManager } from './lib/backup';
import { getAccountingDocumentation } from './lib/accountingDocs';

export default function App() {
  const initialized = useStore((state) => state.initialized);
  const [tab, setTab] = useState('ops'); // ops, cats, reps, sets
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;

    const performBackup = async () => {
      try {
        const state = useStore.getState();
        const exportPayload = {
          ...state,
          documentacion_contable: getAccountingDocumentation()
        };
        const cleanPayload = JSON.parse(JSON.stringify(exportPayload));
        await backupManager.saveDailyBackup(cleanPayload);
      } catch (err) {
        console.error("Error auto-guardando respaldo:", err);
      }
    };

    // Attempt backup on boot
    performBackup();

    // Attempt backup every 30 mins to guarantee 24/7 uptime captures (1000 * 60 * 30 = 1,800,000 ms)
    const interval = setInterval(performBackup, 1800000);

    return () => clearInterval(interval);
  }, [initialized]);

  if (!initialized) {
    return <Onboarding />;
  }

  return (
    <Layout currentTab={tab} onTabChange={setTab}>
      {tab === 'ops' && <Dashboard onOpenModal={setModal} />}
      {tab === 'cats' && <Catalogs />}
      {tab === 'reps' && <Reports />}
      {tab === 'sets' && <Settings />}

      {/* Modals are always mounted but hidden until needed, or conditionally rendered. Conditional is better for state reset. */}
      {modal === 'purchase' && <PurchaseModal isOpen={true} onClose={() => setModal(null)} />}
      {modal === 'sale' && <SaleModal isOpen={true} onClose={() => setModal(null)} />}
      {modal === 'expense' && <ExpenseModal isOpen={true} onClose={() => setModal(null)} />}
      {modal === 'production' && <ProductionModal isOpen={true} onClose={() => setModal(null)} />}
      {modal === 'inventory_count' && <InventoryCountModal isOpen={true} onClose={() => setModal(null)} />}
      {modal === 'asset_count' && <AssetCountModal isOpen={true} onClose={() => setModal(null)} />}
      {modal === 'cash_adjustment' && <CashAdjustmentModal isOpen={true} onClose={() => setModal(null)} />}
    </Layout>
  );
}
