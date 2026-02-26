import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button, Input, Modal, Combobox, cn } from '../ui';
import { Trash2, ChevronDown } from 'lucide-react';
import { AccountingActions } from '../../lib/accounting';
import { AccountingFeedback } from '../AccountingFeedback';

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
        inventory, addInventoryItem, updateInventoryItem,
        addAssetItem,
        providers, addProvider,
        addProduct, getLedgerAccounts
    } = useStore();

    const [tab, setTab] = useState<'inventory' | 'asset'>('inventory');
    const [form, setForm] = useState({ itemId: '', itemName: '', amount: '', quantity: '1', method: 'caja_chica', provId: '' });

    // Smart Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', isProduct: false, cost: '' });

    // Feedback State
    const [feedback, setFeedback] = useState<{ isOpen: boolean, prev: any, curr: any, description?: string }>({ isOpen: false, prev: null, curr: null, description: '' });

    // Handlers needed for Combobox to Quick Create
    const handleCreateInv = (name: string) => {
        // Prevent duplicates by checking if case-insensitive name exists
        const existing = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            setForm(prev => ({ ...prev, itemId: existing.id, itemName: existing.name }));
            return;
        }

        // Intercept: Don't create yet. Open sub-dialog.
        setNewItem({ name, isProduct: false, cost: '' });
        setIsCreating(true);
    };

    const confirmCreateInv = () => {
        if (!newItem.name) return;
        const id = crypto.randomUUID();
        const cost = parseFloat(newItem.cost || '0');

        // 1. Create Inventory Item
        addInventoryItem({ id, name: newItem.name, cost, stock: 0 });

        // 2. Create Product (if checked)
        if (newItem.isProduct) {
            addProduct({
                id: crypto.randomUUID(),
                name: newItem.name,
                price: 0, // Price to be set in catalog
                inventoryItemId: id // Linked
            });
        }

        // 3. Select it in form
        setForm(prev => ({ ...prev, itemId: id, itemName: newItem.name }));
        setIsCreating(false);
        setNewItem({ name: '', isProduct: false, cost: '' });
    };

    const handleCreateProv = (name: string) => {
        const id = crypto.randomUUID();
        addProvider({ id, name });
        setForm(prev => ({ ...prev, provId: id }));
    };

    const handleSubmit = () => {
        const amount = parseFloat(form.amount || '0');
        const quantity = parseFloat(form.quantity || '0');

        if (amount <= 0) return;

        const prevLedger = { ...accounts, ...getLedgerAccounts() }; // Capture snapshot
        let newAccounts = accounts;
        if (tab === 'inventory') {
            newAccounts = AccountingActions.purchaseInventory(accounts, amount, form.method as any);

            // Update Inventory Stock & Cost (FIFO Appending)
            if (form.itemId && quantity > 0) {
                const item = inventory.find(i => i.id === form.itemId);
                if (item) {
                    const newBatch = {
                        id: crypto.randomUUID(),
                        date: new Date().toISOString(),
                        stock: quantity,
                        cost: amount / quantity
                    };

                    const existingBatches = item.batches && item.batches.length > 0 ? [...item.batches] : [{
                        id: 'legacy-' + crypto.randomUUID(),
                        date: new Date(0).toISOString(),
                        cost: item.cost,
                        stock: item.stock
                    }];

                    const oldVal = item.cost * item.stock;
                    const purchaseVal = amount; // Total spent
                    const newStock = item.stock + quantity;
                    const newAvgCost = (oldVal + purchaseVal) / newStock;

                    updateInventoryItem(form.itemId, {
                        stock: newStock,
                        cost: newAvgCost,
                        batches: [...existingBatches, newBatch]
                    });
                }
            }
        } else {
            newAccounts = AccountingActions.purchaseAsset(accounts, amount, form.method as any);

            // Asset Logic
            if (quantity > 0) {
                // Check if asset exists (simple check by name for now, or just always add new?)
                // Simplification: Always add NEW asset record for each purchase batch, or grouping?
                // Plan says: "Update Asset definition to include quantity".
                // So we should see if we selected an existing Asset ID (not yet implemented in UI selector for Assets),
                // OR create a new one.
                // The currrent UI for Asset is just "Description" (Text Input).
                // So we create a NEW Asset Item.
                addAssetItem({
                    id: crypto.randomUUID(),
                    name: form.itemName,
                    value: amount, // Total Value
                    quantity: quantity
                });
            }
        }

        const targetProvider = providers?.find(p => p.id === form.provId)?.name;

        updateAccounts(() => newAccounts);
        addTransaction({
            id: crypto.randomUUID(), type: 'PURCHASE', date: new Date().toISOString(), amount,
            description: `Compra ${tab === 'inventory' ? 'Insumo' : 'Activo'}: ${form.itemName} (x${quantity})`,
            details: { itemName: form.itemName, quantity, method: form.method, type: tab, providerName: targetProvider }
        });

        const freshState = useStore.getState();
        const currLedger = { ...freshState.accounts, ...freshState.getLedgerAccounts() };

        // Trigger Feedback instead of closing immediately
        setFeedback({ isOpen: true, prev: prevLedger as any, curr: currLedger as any, description: `Compraste: ${form.itemName} (x${quantity})` });
        setForm({ itemId: '', itemName: '', amount: '', quantity: '1', method: 'caja_chica', provId: '' });
    };

    const closeAll = () => {
        setFeedback({ isOpen: false, prev: null, curr: null, description: '' });
        onClose();
    };

    return (
        <>
            <Modal isOpen={isOpen && !feedback.isOpen} onClose={onClose} title="Registrar Compra">
                {isCreating ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h3 className="font-bold text-blue-900 mb-2">Nuevo Insumo</h3>
                            <p className="text-xs text-blue-700 mb-4">Especifique unidad en el nombre (ej: Leche 1L)</p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre Descriptivo</label>
                                    <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Harina 1Kg" autoFocus />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Costo Unitario (Opcional)</label>
                                    <Input type="number" value={newItem.cost} onChange={e => setNewItem({ ...newItem, cost: e.target.value })} placeholder="0.00" />
                                </div>

                                <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-jardin-primary"
                                        checked={newItem.isProduct}
                                        onChange={e => setNewItem({ ...newItem, isProduct: e.target.checked })}
                                    />
                                    <div className="text-sm">
                                        <div className="font-bold">Disponible para Venta</div>
                                        <div className="text-xs text-gray-500">Crear automáticamente en Menú</div>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                                <Button className="flex-1" onClick={confirmCreateInv}>Confirmar Creación</Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setTab('inventory')} className={cn("flex-1 py-2 rounded-lg text-sm font-medium", tab === 'inventory' && "bg-white shadow-sm")}>Insumo</button>
                            <button onClick={() => setTab('asset')} className={cn("flex-1 py-2 rounded-lg text-sm font-medium", tab === 'asset' && "bg-white shadow-sm")}>Activo Fijo</button>
                        </div>

                        {tab === 'inventory' ? (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium ml-1">Buscar Insumo</label>
                                    <Combobox
                                        items={inventory}
                                        placeholder="Buscar o crear insumo..."
                                        onSelect={(i: any) => setForm({ ...form, itemId: i.id, itemName: i.name })}
                                        onCreate={handleCreateInv}
                                    />
                                </div>
                            </>
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
                            <div className="w-24">
                                <label className="text-xs font-medium ml-1">Cantidad</label>
                                <Input type="number" placeholder="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium ml-1">Monto Total</label>
                                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                            </div>
                        </div>

                        <PaymentMethod value={form.method} onChange={(m: any) => setForm({ ...form, method: m })} />
                        <Button className="w-full" onClick={handleSubmit}>Registrar Salida de Dinero</Button>
                    </div>
                )}
            </Modal>

            {feedback.isOpen && (
                <AccountingFeedback
                    isOpen={feedback.isOpen}
                    onClose={closeAll}
                    prev={feedback.prev}
                    curr={feedback.curr}
                    title="Compra Registrada"
                    description={feedback.description}
                />
            )}
        </>
    );
};

// 2. Sale
// 2. Sale (Venta con Carrito)
export const SaleModal = ({ isOpen, onClose }: any) => {
    const {
        accounts, updateAccounts, addTransaction,
        products, addProduct, getLedgerAccounts
    } = useStore();

    // Cart State: price is string to allow editing "500" -> "" -> "450"
    const [cart, setCart] = useState<{ id: string; name: string; price: string; qty: number }[]>([]);
    const [method, setMethod] = useState('caja_chica');
    const [feedback, setFeedback] = useState<{ isOpen: boolean, prev: any, curr: any, description?: string }>({ isOpen: false, prev: null, curr: null });

    const handleCreateProd = (name: string) => {
        const id = crypto.randomUUID();
        const newProd = { id, name, price: 0 };
        addProduct(newProd);
        addToCart(newProd); // Add immediately
    };

    const addToCart = (product: any) => {
        setCart([...cart, { id: product.id, name: product.name, price: product.price.toString(), qty: 1 }]);
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: 'price' | 'qty', value: string) => {
        const newCart = [...cart];
        if (field === 'price') {
            newCart[index].price = value;
        } else {
            // Qty must be number
            const qty = parseInt(value) || 0;
            newCart[index].qty = qty;
        }
        setCart(newCart);
    };

    const totalAmount = cart.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.qty), 0);

    const handleSubmit = () => {
        if (cart.length === 0 || totalAmount <= 0) return;

        const prevLedger = { ...accounts, ...getLedgerAccounts() };

        // In the Periodic Inventory Model, sales do not track COGS immediately.
        // Cost of Goods Sold is realized via physical "Inventory Adjustments" later.
        let totalCOGS = 0;
        let isInventoriable = false;

        const newAccounts = AccountingActions.registerSale(accounts, totalAmount, totalCOGS, isInventoriable, method as any);
        updateAccounts(() => newAccounts);

        const desc = cart.map(i => `${i.name} (x${i.qty})`).join(', ');

        addTransaction({
            id: crypto.randomUUID(),
            type: 'SALE',
            date: new Date().toISOString(),
            amount: totalAmount,
            description: `Venta: ${desc}`,
            cogs: totalCOGS,
            details: { cart, method }
        });

        // We must fetch from fresh state because updateAccounts and addTransaction run synchronously but getLedgerAccounts relies on the new Tx
        const freshState = useStore.getState();
        const currLedger = { ...freshState.accounts, ...freshState.getLedgerAccounts() };

        setFeedback({ isOpen: true, prev: prevLedger as any, curr: currLedger as any, description: `Venta Total: ₡${totalAmount.toLocaleString()} (${cart.length} items)` });
        setCart([]);
        setMethod('caja_chica');
    };

    const closeAll = () => {
        setFeedback({ isOpen: false, prev: null, curr: null });
        onClose();
    };

    return (
        <>
            <Modal isOpen={isOpen && !feedback.isOpen} onClose={onClose} title="Registrar Venta">
                <div className="space-y-4">
                    {/* Product Search / Add */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium ml-1">Agregar Producto</label>
                        <Combobox
                            items={products}
                            placeholder="Buscar o crear producto..."
                            onSelect={addToCart}
                            onCreate={handleCreateProd}
                            value="" // Always clear after selection
                        />
                    </div>

                    {/* Cart List */}
                    <div className="min-h-[150px] max-h-[40vh] overflow-y-auto border rounded-xl bg-gray-50 p-2 space-y-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic py-8">
                                Carrito vacío. Agrega productos arriba.
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                                    <div className="flex-1">
                                        <div className="font-medium text-sm text-gray-800">{item.name}</div>
                                        <div className="text-[10px] text-gray-400">Precio Sugerido</div>
                                    </div>

                                    {/* Qty Input */}
                                    <Input
                                        type="number"
                                        className="w-14 h-8 text-center text-sm p-1"
                                        value={item.qty}
                                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                                        placeholder="Can"
                                    />

                                    {/* Price Input */}
                                    <Input
                                        type="number"
                                        className="w-20 h-8 text-right text-sm font-bold p-1"
                                        value={item.price}
                                        onChange={e => updateItem(idx, 'price', e.target.value)}
                                        placeholder="0"
                                    />

                                    <button onClick={() => removeFromCart(idx)} className="text-gray-400 hover:text-red-500 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <span className="font-bold text-blue-900">Total a Cobrar</span>
                        <span className="font-black text-2xl text-blue-700">₡{totalAmount.toLocaleString()}</span>
                    </div>

                    <PaymentMethod value={method} onChange={setMethod} />

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={cart.length === 0 || totalAmount <= 0}
                    >
                        Cobrar ₡{totalAmount.toLocaleString()}
                    </Button>
                </div>
            </Modal>

            {feedback.isOpen && (
                <AccountingFeedback
                    isOpen={feedback.isOpen}
                    onClose={closeAll}
                    prev={feedback.prev}
                    curr={feedback.curr}
                    title="Venta Registrada"
                    description={feedback.description}
                />
            )}
        </>
    );
};

// 3. Expense
export const ExpenseModal = ({ isOpen, onClose }: any) => {
    const {
        accounts, updateAccounts, addTransaction,
        expenseTypes,
        providers, addProvider, getLedgerAccounts
    } = useStore();
    const [form, setForm] = useState({ typeId: '', typeName: '', amount: '', method: 'caja_chica', provId: '', detail: '' });
    const [feedback, setFeedback] = useState<{ isOpen: boolean, prev: any, curr: any, description?: string }>({ isOpen: false, prev: null, curr: null });



    const handleCreateProv = (name: string) => {
        const id = crypto.randomUUID();
        addProvider({ id, name });
        setForm(prev => ({ ...prev, provId: id }));
    };

    const handleSubmit = () => {
        const amount = parseFloat(form.amount || '0');
        if (amount <= 0) return;

        const prevLedger = { ...accounts, ...getLedgerAccounts() };
        const newAccounts = AccountingActions.payExpense(accounts, amount, form.method as any);
        updateAccounts(() => newAccounts);
        addTransaction({
            id: crypto.randomUUID(),
            type: 'EXPENSE',
            date: new Date().toISOString(),
            amount,
            description: `Gasto (${form.typeName})`,
            details: { typeName: form.typeName, method: form.method, detail: form.detail.trim(), provName: form.provId ? providers.find(p => p.id === form.provId)?.name : 'N/A' }
        });

        const freshState = useStore.getState();
        const currLedger = { ...freshState.accounts, ...freshState.getLedgerAccounts() };

        setFeedback({ isOpen: true, prev: prevLedger as any, curr: currLedger as any, description: `Pago de: ${form.typeName}` });
        setForm({ typeId: '', typeName: '', amount: '', method: 'caja_chica', provId: '', detail: '' });
    };

    const closeAll = () => {
        setFeedback({ isOpen: false, prev: null, curr: null });
        onClose();
    };

    return (
        <>
            <Modal isOpen={isOpen && !feedback.isOpen} onClose={onClose} title="Registrar Gasto">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium ml-1">Tipo de Gasto</label>
                        <div className="relative">
                            <select
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-jardin-primary focus:border-jardin-primary transition-all outline-none"
                                value={form.typeName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setForm({ ...form, typeId: val, typeName: val });
                                }}
                            >
                                <option value="" disabled>Seleccione un tipo...</option>
                                {expenseTypes.map((t: any) => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <ChevronDown size={16} />
                            </div>
                        </div>
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

                    <div className="space-y-1">
                        <label className="text-xs font-medium ml-1">Detalle (Opcional)</label>
                        <Input placeholder="Ej: Factura #1234, Limpieza general..." value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} />
                    </div>

                    <Input type="number" placeholder="Monto" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    <PaymentMethod value={form.method} onChange={(m: any) => setForm({ ...form, method: m })} />
                    <Button className="w-full" onClick={handleSubmit}>Registrar Pago</Button>
                </div>
            </Modal>

            {feedback.isOpen && (
                <AccountingFeedback
                    isOpen={feedback.isOpen}
                    onClose={closeAll}
                    prev={feedback.prev}
                    curr={feedback.curr}
                    title="Gasto Registrado"
                    description={feedback.description}
                />
            )}
        </>
    );
};

// 4. Production (Cooking)
export const ProductionModal = ({ isOpen, onClose }: any) => {
    const {
        inventory, updateInventoryItem,
        addInventoryItem, accounts, addTransaction,
        consumeInventoryFIFO, getLedgerAccounts,
        simulateInventoryFIFO
    } = useStore();

    // State
    const [ingredients, setIngredients] = useState<{ item: any, qty: string }[]>([]);
    const [output, setOutput] = useState<{ name: string, qty: string, id?: string }>({ name: '', qty: '1' });
    const [feedback, setFeedback] = useState<{ isOpen: boolean, prev: any, curr: any, description?: string }>({ isOpen: false, prev: null, curr: null });

    // Add Ingredient
    const handleAddIngredient = (item: any) => {
        if (ingredients.find(i => i.item.id === item.id)) return;
        setIngredients([...ingredients, { item, qty: '' }]);
    };

    const handleRemoveIngredient = (id: string) => {
        setIngredients(ingredients.filter(i => i.item.id !== id));
    };

    const handleIngredientQtyChange = (id: string, qty: string) => {
        setIngredients(ingredients.map(i => i.item.id === id ? { ...i, qty } : i));
    };

    // Create new Ingredient on the fly
    const handleCreateIngredient = (name: string) => {
        const newId = crypto.randomUUID();
        const newItem = { id: newId, name, stock: 0, cost: 0 };
        addInventoryItem(newItem);
        handleAddIngredient(newItem);
    };

    // Create Output Product Immediately
    const handleCreateOutput = (name: string) => {
        const newId = crypto.randomUUID();
        // Create in inventory with 0 stock/cost to establish existence
        // The production submission will handle updating its average cost later.
        addInventoryItem({ id: newId, name, stock: 0, cost: 0 });
        setOutput({ ...output, name, id: newId });
    };

    // Calculate Total Cost dynamically simulating strict FIFO deduction
    const totalCost = ingredients.reduce((acc, curr) => {
        const qty = parseFloat(curr.qty || '0');
        return acc + simulateInventoryFIFO(curr.item.id, qty);
    }, 0);

    const outputQty = parseFloat(output.qty || '0');
    const unitCost = outputQty > 0 ? totalCost / outputQty : 0;

    const handleSubmit = () => {
        if (ingredients.length === 0 || !output.name || outputQty <= 0) return;

        let exactTotalCost = 0;

        // 1. Consume Ingredients with FIFO
        ingredients.forEach(ing => {
            const qty = parseFloat(ing.qty || '0');
            exactTotalCost += consumeInventoryFIFO(ing.item.id, qty);
        });

        const prevLedger = { ...accounts, ...getLedgerAccounts() };

        // 2. Update Output Product
        const newBatch = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            stock: outputQty,
            cost: exactTotalCost / outputQty
        };

        const existing = inventory.find(i => i.name.toLowerCase() === output.name.toLowerCase());

        if (existing) {
            const existingBatches = existing.batches && existing.batches.length > 0 ? [...existing.batches] : [{
                id: 'legacy-' + crypto.randomUUID(),
                date: new Date(0).toISOString(),
                cost: existing.cost,
                stock: existing.stock
            }];

            const newStock = existing.stock + outputQty;
            const newTotalVal = (existing.cost * existing.stock) + exactTotalCost;
            const newAvgCost = newStock > 0 ? newTotalVal / newStock : 0;

            updateInventoryItem(existing.id, {
                stock: newStock,
                cost: newAvgCost,
                batches: [...existingBatches, newBatch]
            });
        } else {
            addInventoryItem({
                id: crypto.randomUUID(),
                name: output.name,
                stock: outputQty,
                cost: newBatch.cost, // Use explicit exact batch cost
                batches: [newBatch]
            });
        }

        // 3. Accounting
        const ingText = ingredients.map(i => `${i.qty}x ${i.item.name}`).join(', ');
        addTransaction({
            id: crypto.randomUUID(),
            type: 'PRODUCTION',
            date: new Date().toISOString(),
            amount: exactTotalCost,
            description: `Cocina: ${outputQty}x ${output.name} (usando ${ingText})`,
            cogs: exactTotalCost,
            details: { outputName: output.name, outputQty, ingredients }
        });

        const freshState = useStore.getState();
        const currLedger = { ...freshState.accounts, ...freshState.getLedgerAccounts() };

        setFeedback({
            isOpen: true,
            prev: prevLedger as any,
            curr: currLedger as any,
            description: `Produjiste: ${output.name} (${outputQty} unidades)`
        });

        setIngredients([]);
        setOutput({ name: '', qty: '1' });
    };

    const closeAll = () => {
        setFeedback({ isOpen: false, prev: null, curr: null });
        onClose();
    };


    return (
        <>
            <Modal isOpen={isOpen && !feedback.isOpen} onClose={onClose} title="Producción (Cocina)" className="max-w-4xl">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Ingredients Column */}
                    <div className="space-y-4 border-r pr-4">
                        <h4 className="font-bold text-sm text-gray-500 uppercase">1. Insumos (Receta)</h4>
                        <Combobox
                            items={inventory}
                            placeholder="Agregar insumo..."
                            onSelect={handleAddIngredient}
                            onCreate={handleCreateIngredient}
                            value=""
                        />
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {ingredients.length === 0 && (
                                <div className="text-gray-400 text-sm text-center italic py-4">
                                    No hay ingredientes agregados
                                </div>
                            )}
                            {ingredients.map((ing) => (
                                <div key={ing.item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                    <div>
                                        <div className="font-bold text-gray-700">{ing.item.name}</div>
                                        <div className="text-xs text-gray-400">Stock: {ing.item.stock} | Costo: {ing.item.cost}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="w-20 text-right h-8"
                                            placeholder="Cant"
                                            value={ing.qty}
                                            onChange={(e) => handleIngredientQtyChange(ing.item.id, e.target.value)}
                                        />
                                        <button onClick={() => handleRemoveIngredient(ing.item.id)} className="text-gray-300 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-100 p-2 rounded flex justify-between font-bold text-sm">
                            <span>Costo Total Insumos:</span>
                            <span>₡{totalCost.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Output Column */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm text-gray-500 uppercase">2. Producto Final</h4>

                        <div className="space-y-1">
                            <label className="text-xs font-medium ml-1">Nombre del Producto</label>
                            <Combobox
                                items={inventory} // Can select existing to replenish stock
                                placeholder="Ej: Picadillo por kg"
                                onSelect={(i: any) => setOutput({ ...output, name: i.name })}
                                onCreate={handleCreateOutput}
                                value={output.name}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="w-1/2">
                                <label className="text-xs font-medium ml-1">Cantidad Resultante</label>
                                <Input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={output.qty}
                                    onChange={e => setOutput({ ...output, qty: e.target.value })}
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="text-xs font-medium ml-1">Costo Unitario (Calc)</label>
                                <div className="p-2 bg-gray-100 rounded border border-gray-200 text-right font-mono font-bold text-gray-600">
                                    ₡{unitCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8">
                            <Button
                                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-gray-400"
                                onClick={handleSubmit}
                                disabled={ingredients.length === 0 || !output.name}
                            >
                                <div className="flex flex-col items-center leading-tight">
                                    <span>
                                        {!output.name ? 'Falta Nombre Producto' :
                                            ingredients.length === 0 ? 'Falta Agregar Insumos' :
                                                'Confirmar Producción'}
                                    </span>
                                    <span className="text-[10px] opacity-80 font-normal">
                                        {!output.name ? 'Selecciona o crea el producto final' :
                                            ingredients.length === 0 ? 'Agrega al menos un ingrediente' :
                                                'Transformar Insumos en Producto'}
                                    </span>
                                </div>
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {feedback.isOpen && (
                <AccountingFeedback
                    isOpen={feedback.isOpen}
                    onClose={closeAll}
                    prev={feedback.prev}
                    curr={feedback.curr}
                    title="Producción Exitosa"
                    description={feedback.description}
                />
            )}
        </>
    );
};

// 5. Inventory Count
export const InventoryCountModal = ({ isOpen, onClose }: any) => {
    const { inventory, updateInventoryItem, accounts, updateAccounts, addTransaction, consumeInventoryFIFO } = useStore();

    // State: map of itemId -> newStock (string to allow typing)
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');

    const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

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
        let exactTotalDiff = 0;
        let itemsAdjusted = 0;

        // Process updates
        Object.entries(counts).forEach(([id, valStr]) => {
            const item = inventory.find(i => i.id === id);
            if (!item) return;

            const realStock = parseFloat(valStr || '0');
            const difference = item.stock - realStock; // Positive if stock was lost

            if (difference > 0) {
                // Lost stock -> FIFO deduction
                const lostCost = consumeInventoryFIFO(id, difference);
                exactTotalDiff += lostCost;
                itemsAdjusted++;
            } else if (difference < 0) {
                // Found stock -> Add new batch at current average cost
                const extraQty = Math.abs(difference);
                const avgCost = item.cost;
                const newBatch = {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    stock: extraQty,
                    cost: avgCost
                };

                const existingBatches = item.batches && item.batches.length > 0 ? [...item.batches] : [{
                    id: 'legacy-' + crypto.randomUUID(),
                    date: new Date(0).toISOString(),
                    cost: item.cost,
                    stock: item.stock
                }];

                const newStock = item.stock + extraQty;
                const newTotalVal = (item.cost * item.stock) + (extraQty * avgCost);
                const newAvgCost = newStock > 0 ? newTotalVal / newStock : 0;

                updateInventoryItem(id, {
                    stock: newStock,
                    cost: newAvgCost,
                    batches: [...existingBatches, newBatch]
                });

                exactTotalDiff -= (extraQty * avgCost); // Negative difference = gained value
                itemsAdjusted++;
            }
        });

        if (itemsAdjusted === 0) {
            onClose(); return;
        }

        // 2. Accounting Adjustment
        const newAccounts = AccountingActions.adjustInventoryValues(accounts, exactTotalDiff);
        updateAccounts(() => newAccounts);

        // 3. Log
        addTransaction({
            id: crypto.randomUUID(),
            type: 'ADJUSTMENT',
            date: new Date().toISOString(),
            amount: Math.abs(exactTotalDiff),
            description: `Toma Físico (${itemsAdjusted} items, Val: ₡${exactTotalDiff.toFixed(2)})`,
            cogs: exactTotalDiff,
            details: { itemsAdjusted, exactTotalDiff, counts }
        });

        onClose();
        setCounts({});
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Toma de Inventario Físico">
            <div className="flex flex-col h-[60vh]">
                <div className="mb-4">
                    <Input
                        placeholder="Buscar insumo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
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
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-400 text-sm">
                                        No se encontraron insumos.
                                    </td>
                                </tr>
                            )}
                            {filtered.map(item => (
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

// 6. Asset Count (Toma de Activos)


// 6. Asset Count (Toma de Activos)
export const AssetCountModal = ({ isOpen, onClose }: any) => {
    const { assets, batchUpdateAssets, accounts, updateAccounts, addTransaction } = useStore();

    // State
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');

    // Safety check matching Inventory, but treating undefined as empty
    const safeAssets = Array.isArray(assets) ? assets : [];
    const filtered = safeAssets.filter(i => i && i.name && i.name.toLowerCase().includes(search.toLowerCase()));

    const getDiffValue = () => {
        let diff = 0;
        Object.entries(counts).forEach(([id, valStr]) => {
            const item = safeAssets.find(i => i && i.id === id);
            if (item) {
                const sysVal = item.value || 0;
                const realVal = parseFloat(valStr || '0');
                diff += (sysVal - realVal);
            }
        });
        return diff;
    };

    const diff = getDiffValue();

    const handleSubmit = () => {
        const itemUpdates: any[] = [];

        Object.entries(counts).forEach(([id, valStr]) => {
            const item = safeAssets.find(i => i && i.id === id);
            if (item) {
                const sysVal = item.value || 0;
                const realVal = parseFloat(valStr || '0');
                if (sysVal !== realVal) {
                    itemUpdates.push({ ...item, value: realVal });
                }
            }
        });

        if (itemUpdates.length === 0) {
            onClose(); return;
        }

        batchUpdateAssets(itemUpdates);

        // Accounting Adjustment
        const newAccounts = { ...accounts };
        newAccounts.activo_fijo -= diff;
        newAccounts.gastos += diff;

        updateAccounts(() => newAccounts);

        addTransaction({
            id: crypto.randomUUID(),
            type: 'ADJUSTMENT',
            date: new Date().toISOString(),
            amount: Math.abs(diff),
            description: `Ajuste de Activos (Dif: ${diff > 0 ? '-' : '+'}₡${Math.abs(diff)})`,
            cogs: diff,
            details: { counts, diff }
        });

        onClose();
        setCounts({});
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Toma de Activos Físicos">
            <div className="flex flex-col h-[60vh]">
                <div className="mb-4">
                    <Input
                        placeholder="Buscar activo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex-1 overflow-y-auto mb-4 border rounded-xl">
                    <table className="w-full text-sm text-left relative">
                        <thead className="text-gray-500 bg-gray-50 sticky top-0 z-10 text-xs uppercase">
                            <tr>
                                <th className="p-3">Activo</th>
                                <th className="p-3 text-center">Valor Sistema</th>
                                <th className="p-3 w-32">Valor Real</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-400 text-sm">
                                        No se encontraron activos.
                                    </td>
                                </tr>
                            )}
                            {filtered.map(item => (
                                <tr key={item.id}>
                                    <td className="p-3 font-medium">{item.name}</td>
                                    <td className="p-3 text-center text-gray-500">₡{(item.value || 0).toLocaleString()}</td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            className={cn("w-28 p-1 border rounded text-right focus:outline-none focus:ring-2",
                                                counts[item.id] && parseFloat(counts[item.id]) !== (item.value || 0) ? "border-amber-400 bg-amber-50" : "border-gray-200"
                                            )}
                                            placeholder={(item.value || 0).toString()}
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

// 7. Cash & Bank Adjustment (Ajuste de Caja Chica y Bancos)
export const CashAdjustmentModal = ({ isOpen, onClose }: any) => {
    const { accounts, updateAccounts, addTransaction } = useStore();

    // State
    const [counts, setCounts] = useState<Record<string, string>>({
        caja_chica: accounts.caja_chica.toString(),
        banco: accounts.banco.toString()
    });

    const getDiffValue = (account: 'caja_chica' | 'banco') => {
        const sysVal = accounts[account];
        const realVal = parseFloat(counts[account] || '0');
        // Positive diff means we lost money (System > Real)
        return sysVal - realVal;
    };

    const diffCaja = getDiffValue('caja_chica');
    const diffBanco = getDiffValue('banco');
    const totalDiff = diffCaja + diffBanco;

    const handleSubmit = () => {
        if (totalDiff === 0) {
            onClose(); return;
        }

        let newAccounts = { ...accounts };
        if (diffCaja !== 0) {
            newAccounts = AccountingActions.auditCash(newAccounts, accounts.caja_chica, parseFloat(counts.caja_chica || '0'), 'caja_chica');
            addTransaction({
                id: crypto.randomUUID(),
                type: 'ADJUSTMENT',
                date: new Date().toISOString(),
                amount: Math.abs(diffCaja),
                description: `Ajuste Caja Chica (Dif: ${diffCaja > 0 ? '-' : '+'}₡${Math.abs(diffCaja)})`
            });
        }
        if (diffBanco !== 0) {
            newAccounts = AccountingActions.auditCash(newAccounts, accounts.banco, parseFloat(counts.banco || '0'), 'banco');
            addTransaction({
                id: crypto.randomUUID(),
                type: 'ADJUSTMENT',
                date: new Date().toISOString(),
                amount: Math.abs(diffBanco),
                description: `Ajuste Bancos (Dif: ${diffBanco > 0 ? '-' : '+'}₡${Math.abs(diffBanco)})`
            });
        }

        updateAccounts(() => newAccounts);

        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajuste de Caja Chica y Bancos">
            <div className="flex flex-col space-y-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                        <div className="text-emerald-800 font-bold mb-1">Caja Chica</div>
                        <div className="text-xs text-emerald-600">Sistema: ₡{accounts.caja_chica.toLocaleString()}</div>
                    </div>
                    <div>
                        <input
                            type="number"
                            className={cn("w-32 p-2 border rounded-lg text-right font-bold focus:outline-none focus:ring-2",
                                diffCaja !== 0 ? "border-amber-400 bg-amber-50" : "border-gray-200"
                            )}
                            value={counts.caja_chica}
                            onChange={e => setCounts({ ...counts, caja_chica: e.target.value })}
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div>
                        <div className="text-blue-800 font-bold mb-1">Bancos</div>
                        <div className="text-xs text-blue-600">Sistema: ₡{accounts.banco.toLocaleString()}</div>
                    </div>
                    <div>
                        <input
                            type="number"
                            className={cn("w-32 p-2 border rounded-lg text-right font-bold focus:outline-none focus:ring-2",
                                diffBanco !== 0 ? "border-amber-400 bg-amber-50" : "border-gray-200"
                            )}
                            value={counts.banco}
                            onChange={e => setCounts({ ...counts, banco: e.target.value })}
                        />
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center mt-4">
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase">Ajuste Valor (Diferencia)</div>
                        <div className={cn("text-xl font-black", totalDiff > 0 ? "text-red-600" : totalDiff < 0 ? "text-green-600" : "text-gray-400")}>
                            {totalDiff > 0 ? '-' : totalDiff < 0 ? '+' : ''}₡{Math.abs(totalDiff).toLocaleString()}
                        </div>
                    </div>
                    <Button onClick={handleSubmit} disabled={totalDiff === 0}>Confirmar Ajuste</Button>
                </div>
            </div>
        </Modal>
    );
};
