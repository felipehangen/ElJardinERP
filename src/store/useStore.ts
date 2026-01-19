import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INITIAL_STATE } from '../types';
import type { AppState, Accounts, InventoryItem, Product, Transaction, Provider, ExpenseType, AssetItem } from '../types';

interface StoreActions {
    setInitialized: (val: boolean) => void;
    updateAccounts: (fn: (prev: Accounts) => Accounts) => void;

    // Inventory
    addInventoryItem: (item: InventoryItem) => void;
    updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
    deleteInventoryItem: (id: string) => void;

    // Assets
    addAssetItem: (item: AssetItem) => void;
    deleteAssetItem: (id: string) => void;

    // Products
    addProduct: (item: Product) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    deleteProduct: (id: string) => void;

    // Providers
    addProvider: (item: Provider) => void;
    deleteProvider: (id: string) => void;

    // Expense Types
    addExpenseType: (item: ExpenseType) => void;
    deleteExpenseType: (id: string) => void;

    // Transactions
    addTransaction: (t: Transaction) => void;

    // Complex Actions
    batchUpdateInventory: (updates: InventoryItem[]) => void;

    // System
    importState: (state: AppState) => void;
    reset: () => void;
}

export const useStore = create<AppState & StoreActions>()(
    persist(
        (set) => ({
            ...INITIAL_STATE,
            setInitialized: (val) => set({ initialized: val }),
            updateAccounts: (fn) => set((state) => ({ accounts: fn(state.accounts) })),

            addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
            updateInventoryItem: (id, updates) => set((state) => ({
                inventory: state.inventory.map((i) => (i.id === id ? { ...i, ...updates } : i)),
            })),
            deleteInventoryItem: (id) => set((state) => ({ inventory: state.inventory.filter((i) => i.id !== id) })),

            addAssetItem: (item) => set((state) => ({ assets: [...state.assets, item] })),
            deleteAssetItem: (id) => set((state) => ({ assets: state.assets.filter((i) => i.id !== id) })),

            addProduct: (item) => set((state) => ({ products: [...state.products, item] })),
            updateProduct: (id, updates) => set((state) => ({
                products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
            })),
            deleteProduct: (id) => set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

            addProvider: (item) => set((state) => ({ providers: [...state.providers, item] })),
            deleteProvider: (id) => set((state) => ({ providers: state.providers.filter((p) => p.id !== id) })),

            addExpenseType: (item) => set((state) => ({ expenseTypes: [...state.expenseTypes, item] })),
            deleteExpenseType: (id) => set((state) => ({ expenseTypes: state.expenseTypes.filter((p) => p.id !== id) })),

            addTransaction: (t) => set((state) => ({ transactions: [t, ...state.transactions] })),

            batchUpdateInventory: (updates) => set((state) => {
                // Create a map for faster lookup
                const updateMap = new Map(updates.map(u => [u.id, u]));
                return {
                    inventory: state.inventory.map(item => updateMap.get(item.id) || item)
                };
            }),

            importState: (newState) => set(() => newState),
            reset: () => set(() => INITIAL_STATE),
        }),
        {
            name: 'jardin-erp-storage-v4',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
