import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button, Input, Card, cn } from './ui';
import { Trash2, Plus, Box, Tag, Users, FileText } from 'lucide-react';

export const Catalogs = () => {
    const {
        inventory, products, providers, expenseTypes,
        addInventoryItem, deleteInventoryItem,
        addProduct, updateProduct, deleteProduct,
        addProvider, deleteProvider,
        addExpenseType, deleteExpenseType
    } = useStore();

    const [activeTab, setActiveTab] = useState<'inv' | 'prod' | 'prov' | 'exp'>('inv');

    // Forms
    const [invForm, setInvForm] = useState({ name: '', cost: '' });
    const [prodForm, setProdForm] = useState({ name: '', price: '' });
    const [provForm, setProvForm] = useState('');
    const [expForm, setExpForm] = useState('');

    const Tabs = () => (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {[
                { id: 'inv', label: 'Insumos', icon: Box },
                { id: 'prod', label: 'Productos Venta', icon: Tag },
                { id: 'prov', label: 'Proveedores', icon: Users },
                { id: 'exp', label: 'Tipos Gasto', icon: FileText },
            ].map(t => (
                <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border",
                        activeTab === t.id
                            ? "bg-white border-jardin-primary text-jardin-primary shadow-sm"
                            : "bg-transparent border-transparent text-gray-500 hover:bg-white hover:border-gray-200"
                    )}
                >
                    <t.icon size={16} />
                    {t.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Catálogos</h2>
            <Tabs />

            {/* Inventory */}
            {activeTab === 'inv' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold mb-4">Nuevo Insumo</h3>
                        <div className="flex gap-4">
                            <Input placeholder="Nombre + Unidad (ej: Arroz 1kg)" value={invForm.name} onChange={e => setInvForm({ ...invForm, name: e.target.value })} />
                            <Input type="number" placeholder="Costo Estándar" className="w-40" value={invForm.cost} onChange={e => setInvForm({ ...invForm, cost: e.target.value })} />
                            <Button onClick={() => {
                                if (!invForm.name || !invForm.cost) return;
                                addInventoryItem({ id: crypto.randomUUID(), name: invForm.name, cost: parseFloat(invForm.cost || '0'), stock: 0 }); // Stock managed in ops
                                setInvForm({ name: '', cost: '' });
                            }}><Plus size={20} /></Button>
                        </div>
                    </Card>
                    <div className="bg-white rounded-xl border border-gray-100 divide-y">
                        {inventory.map(i => (
                            <div key={i.id} className="p-4 flex justify-between items-center text-sm">
                                <span className="font-medium">{i.name}</span>
                                <div className="flex items-center gap-4 text-gray-500">
                                    <span>Ref: ₡{i.cost}</span>
                                    <button onClick={() => deleteInventoryItem(i.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Products */}
            {activeTab === 'prod' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold mb-4">Nuevo Producto</h3>
                        <div className="flex gap-4">
                            <Input placeholder="Nombre (ej: Casado Pollo)" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} />
                            <Input type="number" placeholder="Precio Venta" className="w-40" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} />
                            <Button onClick={() => {
                                if (!prodForm.name || !prodForm.price) return;
                                addProduct({ id: crypto.randomUUID(), name: prodForm.name, price: parseFloat(prodForm.price || '0') });
                                setProdForm({ name: '', price: '' });
                            }}><Plus size={20} /></Button>
                        </div>
                    </Card>
                    <div className="bg-white rounded-xl border border-gray-100 divide-y">
                        {products.map(i => (
                            <div key={i.id} className="p-4 flex justify-between items-center text-sm">
                                <input value={i.name} onChange={e => updateProduct(i.id, { name: e.target.value })} className="font-medium bg-transparent focus:underline outline-none" />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">₡</span>
                                    <input
                                        type="number"
                                        value={i.price}
                                        onChange={e => updateProduct(i.id, { price: parseFloat(e.target.value) })}
                                        className="w-24 text-right bg-transparent border-b border-gray-100 focus:border-jardin-primary outline-none"
                                    />
                                    <button onClick={() => deleteProduct(i.id)} className="text-gray-300 hover:text-red-500 ml-2"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Providers */}
            {activeTab === 'prov' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold mb-4">Nuevo Proveedor</h3>
                        <div className="flex gap-4">
                            <Input placeholder="Nombre Empresa / Persona" value={provForm} onChange={e => setProvForm(e.target.value)} />
                            <Button onClick={() => {
                                if (!provForm) return;
                                addProvider({ id: crypto.randomUUID(), name: provForm });
                                setProvForm('');
                            }}><Plus size={20} /></Button>
                        </div>
                    </Card>
                    <div className="bg-white rounded-xl border border-gray-100 divide-y">
                        {providers.map(i => (
                            <div key={i.id} className="p-4 flex justify-between items-center text-sm">
                                <span>{i.name}</span>
                                <button onClick={() => deleteProvider(i.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expense Types */}
            {activeTab === 'exp' && (
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-bold mb-4">Tipo de Gasto</h3>
                        <div className="flex gap-4">
                            <Input placeholder="Nombre (ej: Electricidad, Internet)" value={expForm} onChange={e => setExpForm(e.target.value)} />
                            <Button onClick={() => {
                                if (!expForm) return;
                                addExpenseType({ id: crypto.randomUUID(), name: expForm });
                                setExpForm('');
                            }}><Plus size={20} /></Button>
                        </div>
                    </Card>
                    <div className="bg-white rounded-xl border border-gray-100 divide-y">
                        {expenseTypes.map(i => (
                            <div key={i.id} className="p-4 flex justify-between items-center text-sm">
                                <span>{i.name}</span>
                                <button onClick={() => deleteExpenseType(i.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
