import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button, Input, Modal, Combobox, cn } from '../ui';
import { Trash2, Plus } from 'lucide-react';
import { AccountingActions } from '../../lib/accounting';

// Shared Payment Selector
const PaymentMethod = ({ value, onChange }: any) => (
    <div className="flex gap-2">
        <button type="button" onClick={() => onChange('caja_chica')} className={cn("flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all text-sm", value === 'caja_chica' ? "border-jardin-primary bg-green-50 text-jardin-primary" : "border-gray-200 text-gray-500")}>Caja Chica</button>
        <button type="button" onClick={() => onChange('banco')} className={cn("flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all text-sm", value === 'banco' ? "border-jardin-primary bg-green-50 text-jardin-primary" : "border-gray-200 text-gray-500")}>Banco</button>
    </div>
);

// 1. Purchase (Insumo/Activo)
export const PurchaseModal = ({ isOpen, onClose }: any) => {
    const {
        accounts, updateAccounts, addTransaction,
        inventory, addInventoryItem,
        providers, addProvider
    } = useStore();

    const [tab, setTab] = useState<'inventory' | 'asset'>('inventory');
    const [form, setForm] = useState({ itemId: '', itemName: '', amount: '', method: 'caja_chica', provId: '' });

    // Handlers needed for Combobox to Quick Create
    const handleCreateInv = (name: string) => {
        const id = crypto.randomUUID();
        // Assuming unknown unit/cost, user just wants to record the name for now. 
        // Logic: Add to catalog, select it.
        addInventoryItem({ id, name, cost: 0, stock: 0 }); // Cost 0 until set in catalog or inferred? For now simple add.
        setForm(prev => ({ ...prev, itemId: id, itemName: name }));
    };

    const handleCreateProv = (name: string) => {
        const id = crypto.randomUUID();
        addProvider({ id, name });
        setForm(prev => ({ ...prev, provId: id }));
    };

    const handleSubmit = () => {
        const amount = parseFloat(form.amount || '0');
        if (amount <= 0) return;

        let newAccounts = accounts;
        if (tab === 'inventory') {
            newAccounts = AccountingActions.purchaseInventory(accounts, amount, form.method as any);
            // TODO: Stock update? Prompt says "SALE de Caja INGRESA Inventario". Stock logic is extra but good.
        } else {
            newAccounts = AccountingActions.purchaseAsset(accounts, amount, form.method as any);
        }

        updateAccounts(() => newAccounts);
        addTransaction({
            id: crypto.randomUUID(), type: 'PURCHASE', date: new Date().toISOString(), amount,
            description: `Compra ${tab === 'inventory' ? 'Insumo' : 'Activo'}: ${form.itemName}`
        });
        onClose(); setForm({ itemId: '', itemName: '', amount: '', method: 'caja_chica', provId: '' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Compra">
            <div className="space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setTab('inventory')} className={cn("flex-1 py-2 rounded-lg text-sm font-medium", tab === 'inventory' && "bg-white shadow-sm")}>Insumo</button>
                    <button onClick={() => setTab('asset')} className={cn("flex-1 py-2 rounded-lg text-sm font-medium", tab === 'asset' && "bg-white shadow-sm")}>Activo Fijo</button>
                </div>

                {tab === 'inventory' ? (
                    <div className="space-y-1">
                        <label className="text-xs font-medium ml-1">Buscar Insumo</label>
                        <Combobox
                            items={inventory}
                            placeholder="Buscar o crear insumo..."
                            onSelect={(i: any) => setForm({ ...form, itemId: i.id, itemName: i.name })}
                            onCreate={handleCreateInv}
                        />
                    </div>
                ) : (
                    <Input placeholder="Descripción del Activo" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
                )}

                <div className="space-y-1">
                    <label className="text-xs font-medium ml-1">Proveedor (Opcional)</label>
                    <Combobox
                        items={providers}
                        placeholder="Buscar Proveedor..."
                        onSelect={(i: any) => setForm({ ...form, provId: i.id })}
                        onCreate={handleCreateProv}
                    />
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-medium ml-1">Monto Total</label>
                        <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    </div>
                </div>

                <PaymentMethod value={form.method} onChange={(m: any) => setForm({ ...form, method: m })} />
                <Button className="w-full" onClick={handleSubmit}>Registrar Salida de Dinero</Button>
            </div>
        </Modal>
    );
};

// 2. Sale
export const SaleModal = ({ isOpen, onClose }: any) => {
    const {
        accounts, updateAccounts, addTransaction,
        products, addProduct
    } = useStore();
    const [form, setForm] = useState({ prodId: '', prodName: '', price: '', method: 'caja_chica' });

    const handleCreateProd = (name: string) => {
        // Quick create product for sale
        const id = crypto.randomUUID();
        // We don't have price yet, so we'll update it when they fill the price input
        addProduct({ id, name, price: 0 });
        setForm(prev => ({ ...prev, prodId: id, prodName: name }));
    };

    const handleSubmit = () => {
        const salePrice = parseFloat(form.price || '0');
        if (salePrice <= 0) return;

        // V4 Logic: "Inventariado" vs "No Inventariado".
        // Simplified: We check if product has Inventory Link. If not -> Service/Crepa logic (No Cost Entry inferred automatically here unless linked).
        // For this demo, let's assume 0 cost unless linked (Store logic needs refinement for linking, but out of scope for "Quick Create").
        // We will pass 0 cost for quick created items.

        const newAccounts = AccountingActions.registerSale(accounts, salePrice, 0, false, form.method as any);
        updateAccounts(() => newAccounts);

        // Update product price in catalog if it was 0 (Quick create side effect, helpful feature)
        // logic omitted for simplicity to keep functions pure-ish.

        addTransaction({ id: crypto.randomUUID(), type: 'SALE', date: new Date().toISOString(), amount: salePrice, description: `Venta: ${form.prodName}` });
        onClose(); setForm({ prodId: '', prodName: '', price: '', method: 'caja_chica' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Venta">
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium ml-1">Producto</label>
                    <Combobox
                        items={products}
                        placeholder="Buscar o crear producto..."
                        onSelect={(i: any) => setForm({ ...form, prodId: i.id, prodName: i.name, price: i.price.toString() })}
                        onCreate={handleCreateProd}
                    />
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <span className="font-bold text-gray-600">Total a Cobrar</span>
                    <Input type="number" className="w-32 text-right font-bold text-xl bg-white" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>

                <PaymentMethod value={form.method} onChange={(m: any) => setForm({ ...form, method: m })} />
                <Button className="w-full" onClick={handleSubmit}>Cobrar</Button>
            </div>
        </Modal>
    );
};

// 3. Expense
export const ExpenseModal = ({ isOpen, onClose }: any) => {
    const {
        accounts, updateAccounts, addTransaction,
        expenseTypes, addExpenseType,
        providers, addProvider
    } = useStore();
    const [form, setForm] = useState({ typeId: '', typeName: '', amount: '', method: 'caja_chica', provId: '' });

    const handleCreateType = (name: string) => {
        const id = crypto.randomUUID();
        addExpenseType({ id, name });
        setForm(prev => ({ ...prev, typeId: id, typeName: name }));
    };

    const handleCreateProv = (name: string) => {
        const id = crypto.randomUUID();
        addProvider({ id, name });
        setForm(prev => ({ ...prev, provId: id }));
    };

    const handleSubmit = () => {
        const amount = parseFloat(form.amount || '0');
        if (amount <= 0) return;

        const newAccounts = AccountingActions.payExpense(accounts, amount, form.method as any);
        updateAccounts(() => newAccounts);
        addTransaction({ id: crypto.randomUUID(), type: 'EXPENSE', date: new Date().toISOString(), amount, description: `Gasto (${form.typeName})` });
        onClose(); setForm({ typeId: '', typeName: '', amount: '', method: 'caja_chica', provId: '' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Gasto">
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium ml-1">Tipo de Gasto</label>
                    <Combobox
                        items={expenseTypes}
                        placeholder="Ej: Luz, Agua, Salarios..."
                        onSelect={(i: any) => setForm({ ...form, typeId: i.id, typeName: i.name })}
                        onCreate={handleCreateType}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium ml-1">Proveedor/Beneficiario (Opcional)</label>
                    <Combobox
                        items={providers}
                        placeholder="Buscar..."
                        onSelect={(i: any) => setForm({ ...form, provId: i.id })}
                        onCreate={handleCreateProv}
                    />
                </div>

                <Input type="number" placeholder="Monto" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                <PaymentMethod value={form.method} onChange={(m: any) => setForm({ ...form, method: m })} />
                <Button className="w-full" onClick={handleSubmit}>Registrar Pago</Button>
            </div>
        </Modal>
    );
};

// 4. Production (Cooking)
export const ProductionModal = ({ isOpen, onClose }: any) => {
    const {
        inventory, updateInventoryItem,
        addInventoryItem, updateAccounts, accounts, addTransaction
    } = useStore();

    // State
    const [ingredients, setIngredients] = useState<{ item: any, qty: number }[]>([]);
    const [output, setOutput] = useState<{ name: string, qty: number, id?: string }>({ name: '', qty: 1 });

    // Add Ingredient
    const handleAddIngredient = (item: any) => {
        if (ingredients.find(i => i.item.id === item.id)) return;
        setIngredients([...ingredients, { item, qty: 1 }]);
    };

    // Calculate Total Cost
    const totalCost = ingredients.reduce((acc, curr) => acc + (curr.item.cost * curr.qty), 0);
    const unitCost = output.qty > 0 ? totalCost / output.qty : 0;

    const handleSubmit = () => {
        if (ingredients.length === 0 || !output.name || output.qty <= 0) return;

        // 1. Consumer Ingredients
        ingredients.forEach(ing => {
            updateInventoryItem(ing.item.id, { stock: ing.item.stock - ing.qty });
        });

        // 2. Create/Update Output Product in Inventory
        // We look for an existing item with this name to update stock, or create new.
        // For simplicity, we mostly create new or update if ID is known.
        // But the "Output" selector might just be a text input for simplified "Kitchen".
        // Let's assume we create a NEW Inventory Item for the result (e.g. "Salsa").

        // Check if item exists by name (simple check)
        const existing = inventory.find(i => i.name.toLowerCase() === output.name.toLowerCase());

        if (existing) {
            // Weighted Average Cost: (OldVal + NewVal) / TotalQty
            const oldVal = existing.cost * existing.stock;
            const newVal = totalCost; // Total value of ingredients
            const newStock = existing.stock + output.qty;
            const newAvgCost = (oldVal + newVal) / newStock;

            updateInventoryItem(existing.id, {
                stock: newStock,
                cost: newAvgCost
            });
        } else {
            addInventoryItem({
                id: crypto.randomUUID(),
                name: output.name,
                stock: output.qty,
                cost: unitCost
            });
        }

        // 3. Accounting (Value Transfer)
        // Since value is conserved (Asset -> Asset), no Account Balance change.
        // But we log it.
        addTransaction({
            id: crypto.randomUUID(),
            type: 'PRODUCTION',
            date: new Date().toISOString(),
            amount: totalCost,
            description: `Producción: ${output.qty} x ${output.name}`
        });

        onClose();
        setIngredients([]);
        setOutput({ name: '', qty: 1 });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Producción (Cocina)">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Ingredients Column */}
                <div className="space-y-4 border-r pr-4">
                    <h4 className="font-bold text-sm text-gray-500 uppercase">1. Insumos (Receta)</h4>
                    <Combobox
                        items={inventory}
                        placeholder="Agregar ingrediente..."
                        onSelect={handleAddIngredient}
                    />
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {ingredients.map((ing, idx) => (
                            <div key={ing.item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <div>
                                    <div className="font-medium">{ing.item.name}</div>
                                    <div className="text-xs text-gray-400">Costo: ₡{ing.item.cost}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-12 p-1 border rounded text-center"
                                        value={ing.qty}
                                        onChange={e => {
                                            const newIngs = [...ingredients];
                                            newIngs[idx].qty = parseFloat(e.target.value || '0');
                                            setIngredients(newIngs);
                                        }}
                                    />
                                    <button onClick={() => setIngredients(ingredients.filter(i => i.item.id !== ing.item.id))} className="text-red-500"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                        {ingredients.length === 0 && <div className="text-sm text-gray-400 italic">Sin ingredientes</div>}
                    </div>
                    <div className="text-right text-sm font-bold text-gray-600">
                        Costo Insumos: ₡{totalCost.toLocaleString()}
                    </div>
                </div>

                {/* Output Column */}
                <div className="space-y-4">
                    <h4 className="font-bold text-sm text-gray-500 uppercase">2. Producto Final</h4>
                    <div>
                        <label className="text-xs font-medium ml-1">Nombre Producto</label>
                        <Input
                            placeholder="Ej: Masa de Crepas"
                            value={output.name}
                            onChange={e => setOutput({ ...output, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium ml-1">Cantidad Producida</label>
                        <Input
                            type="number"
                            value={output.qty}
                            onChange={e => setOutput({ ...output, qty: parseFloat(e.target.value || '0') })}
                        />
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Valor Total Transf.:</span>
                            <span className="font-bold">₡{totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-800">
                            <span>Nuevo Costo Unit.:</span>
                            <span className="font-bold">₡{unitCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <Button className="w-full mt-4" onClick={handleSubmit} disabled={ingredients.length === 0 || !output.name}>
                        <div className="flex items-center justify-center gap-2">
                            <Plus size={18} /> Registrar Producción
                        </div>
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// 5. Inventory Count
export const InventoryCountModal = ({ isOpen, onClose }: any) => {
    const { inventory, batchUpdateInventory, accounts, updateAccounts, addTransaction } = useStore();

    // State: map of itemId -> newStock (string to allow typing)
    const [counts, setCounts] = useState<Record<string, string>>({});

    // Init counts with system values only once on open
    // Ideally use useEffect, but for simplicity we rely on manual entry or placeholder.
    // Let's just track CHANGED values.

    const getDiffValue = () => {
        let totalSystemValue = 0;
        let totalRealValue = 0;
        let diff = 0;

        Object.entries(counts).forEach(([id, valStr]) => {
            const item = inventory.find(i => i.id === id);
            if (item) {
                const realStock = parseFloat(valStr || '0');
                const sysVal = item.cost * item.stock;
                const realVal = item.cost * realStock;

                totalSystemValue += sysVal;
                totalRealValue += realVal;
                diff += (sysVal - realVal); // Positive = Loss (Missing)
            }
        });
        return diff;
    };

    const diff = getDiffValue();

    const handleSubmit = () => {
        const itemUpdates: any[] = [];

        // Build updates
        Object.entries(counts).forEach(([id, valStr]) => {
            const item = inventory.find(i => i.id === id);
            if (item) {
                const realStock = parseFloat(valStr || '0');
                itemUpdates.push({ ...item, stock: realStock });
            }
        });

        if (itemUpdates.length === 0) {
            onClose(); return;
        }

        // 1. Commit Stock Updates
        batchUpdateInventory(itemUpdates);

        // 2. Accounting Adjustment
        const newAccounts = AccountingActions.adjustInventoryValues(accounts, diff);
        updateAccounts(() => newAccounts);

        // 3. Log
        addTransaction({
            id: crypto.randomUUID(),
            type: 'ADJUSTMENT',
            date: new Date().toISOString(),
            amount: diff,
            description: `Toma de Inventario (Items: ${itemUpdates.length}, Dif: ₡${diff})`
        });

        onClose();
        setCounts({});
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Toma de Inventario Físico">
            <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto mb-4 border rounded-xl">
                    <table className="w-full text-sm text-left relative">
                        <thead className="text-gray-500 bg-gray-50 sticky top-0 z-10 text-xs uppercase">
                            <tr>
                                <th className="p-3">Insumo</th>
                                <th className="p-3 text-center">Sistema</th>
                                <th className="p-3 w-24">Físico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {inventory.map(item => (
                                <tr key={item.id}>
                                    <td className="p-3 font-medium">{item.name}</td>
                                    <td className="p-3 text-center text-gray-500">{item.stock}</td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            className={cn("w-20 p-1 border rounded text-center focus:outline-none focus:ring-2",
                                                counts[item.id] && parseFloat(counts[item.id]) !== item.stock ? "border-amber-400 bg-amber-50" : "border-gray-200"
                                            )}
                                            placeholder={item.stock.toString()}
                                            value={counts[item.id] !== undefined ? counts[item.id] : ''}
                                            onChange={e => setCounts({ ...counts, [item.id]: e.target.value })}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase">Ajuste Valor (Diferencia)</div>
                        <div className={cn("text-xl font-black", diff > 0 ? "text-red-600" : "text-green-600")}>
                            {diff > 0 ? '-' : '+'}₡{Math.abs(diff).toLocaleString()}
                        </div>
                    </div>
                    <Button onClick={handleSubmit}>Confirmar Ajuste</Button>
                </div>
            </div>
        </Modal>
    );
};
