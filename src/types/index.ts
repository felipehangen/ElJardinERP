export interface AppState {
    initialized: boolean;
    accounts: Accounts;
    inventory: InventoryItem[];
    products: Product[];
    providers: Provider[];
    expenseTypes: ExpenseType[];
    transactions: Transaction[];
    assets: AssetItem[];
}

export interface Accounts {
    caja_chica: number;
    banco: number;
    inventario: number; // Sum of InventoryItem cost * stock
    activo_fijo: number; // Sum of AssetItem cost
    patrimonio: number; // Capital Social = Initial Assets - Initial Liabilities (0)
    ventas: number;
    costos: number;
    gastos: number;
}

export interface InventoryItem {
    id: string;
    name: string; // "Leche 2L"
    cost: number;
    stock: number;
}

export interface AssetItem {
    id: string;
    name: string; // "Crepera"
    value: number;
    quantity: number;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    inventoryItemId?: string; // If linked to an inventory item (e.g. 1 Coca Cola)
}

export interface Provider {
    id: string;
    name: string;
}

export interface ExpenseType {
    id: string;
    name: string; // "Luz", "Agua"
}

export interface Transaction {
    id: string;
    date: string;
    type: 'PURCHASE' | 'SALE' | 'EXPENSE' | 'ADJUSTMENT' | 'PRODUCTION' | 'INITIALIZATION';
    amount: number;
    description: string;
    details?: any;
}

export const INITIAL_STATE: AppState = {
    initialized: false,
    accounts: {
        caja_chica: 0,
        banco: 0,
        inventario: 0,
        activo_fijo: 0,
        patrimonio: 0,
        ventas: 0,
        costos: 0,
        gastos: 0,
    },
    inventory: [],
    products: [],
    providers: [],
    expenseTypes: [],
    transactions: [],
    assets: [],
};
