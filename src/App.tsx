import { useState } from 'react';
import { useStore } from './store/useStore';
import { Onboarding } from './components/Onboarding';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Catalogs } from './components/Catalogs';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { PurchaseModal, SaleModal, ExpenseModal, ProductionModal, InventoryCountModal } from './components/Operations';

export default function App() {
  const initialized = useStore((state) => state.initialized);
  const [tab, setTab] = useState('ops'); // ops, cats, reps, sets
  const [modal, setModal] = useState<string | null>(null);

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
    </Layout>
  );
}
