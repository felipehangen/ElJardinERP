import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, cn, Input } from './ui';
import { FileText, List, Box, Monitor, Wallet, X } from 'lucide-react';
import type { Transaction } from '../types';

const MONTHS = [
    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export const Reports = () => {
    const { accounts, transactions, inventory, assets } = useStore();
    const [tab, setTab] = useState<'financial' | 'transactions' | 'inventory' | 'assets' | 'cash'>('financial');

    // Filter State
    const [filterType, setFilterType] = useState<string>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchInv, setSearchInv] = useState('');
    const [searchAsset, setSearchAsset] = useState('');
    const [financialMonth, setFinancialMonth] = useState('');

    if (!accounts) return <div>Cargando cuentas...</div>;

    // Derived Financial Data (Global)
    const totalActivos = accounts.caja_chica + accounts.banco + accounts.inventario + accounts.activo_fijo;
    const utilidadBrutaGlobal = accounts.ventas - accounts.costos;
    const utilidadNetaGlobal = utilidadBrutaGlobal - accounts.gastos;
    const totalPatrimonio = accounts.patrimonio + utilidadNetaGlobal;

    // Derived Financial Data (Monthly or Global)
    const financialData = useMemo(() => {
        if (!financialMonth) {
            const ub = accounts.ventas - accounts.costos;
            return {
                ventas: accounts.ventas,
                costos: accounts.costos,
                gastos: accounts.gastos,
                utilidadBruta: ub,
                utilidadNeta: ub - accounts.gastos
            };
        }

        // Fix: Parse YYYY-MM explicitly to avoid timezone shifts
        const [yearStr, monthStr] = financialMonth.split('-');
        const selectedYear = parseInt(yearStr);
        const selectedMonth = parseInt(monthStr); // 1-12

        const relevant = transactions.filter(t => {
            // Fix: Use local date to match user expectation
            const d = new Date(t.date);
            return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
        });

        const ventas = relevant.filter(t => t.type === 'SALE').reduce((acc, t) => acc + t.amount, 0);

        const gastos = relevant.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

        // Adjustments logic
        const costsFromAdj = relevant
            .filter(t => t.type === 'ADJUSTMENT' && t.description.toLowerCase().includes('inventario'))
            .reduce((acc, t) => acc + t.amount, 0);

        const expFromAdj = relevant
            .filter(t => t.type === 'ADJUSTMENT' && !t.description.toLowerCase().includes('inventario'))
            .reduce((acc, t) => acc + t.amount, 0);

        const totalGastos = gastos + expFromAdj;
        const totalCostos = costsFromAdj;

        const ub = ventas - totalCostos;

        return {
            ventas,
            costos: totalCostos,
            gastos: totalGastos,
            utilidadBruta: ub,
            utilidadNeta: ub - totalGastos
        };
    }, [accounts, transactions, financialMonth]);

    // Use global utility for Balance Sheet equity calc (retained earnings are cumulative)
    const utilidadNeta = utilidadNetaGlobal;

    // Helper to format month name in Spanish safely
    const getMonthLabel = (ym: string) => {
        if (!ym) return '';
        const [y, m] = ym.split('-');
        // Create date at noon to avoid timezone rolling
        const date = new Date(parseInt(y), parseInt(m) - 1, 15);
        const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
    };

    // Filter Transactions
    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(t => {
            const date = new Date(t.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            const matchType = filterType === 'ALL' || t.type === filterType;
            const matchStart = !start || date >= start;
            const matchEnd = !end || date <= end;

            return matchType && matchStart && matchEnd;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, filterType, startDate, endDate]);

    // Filter Inventory
    const filteredInventory = useMemo(() => {
        return inventory.filter(i => i.name.toLowerCase().includes(searchInv.toLowerCase()));
    }, [inventory, searchInv]);

    // Filter Assets
    const filteredAssets = useMemo(() => {
        return assets.filter(a => a.name.toLowerCase().includes(searchAsset.toLowerCase()));
    }, [assets, searchAsset]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
            </div>

            <div className="flex overflow-x-auto pb-2 gap-2 bg-gray-100 p-1 rounded-xl">
                {[
                    { id: 'financial', label: 'Estados Financieros', icon: FileText },
                    { id: 'inventory', label: 'Inventario', icon: Box },
                    { id: 'assets', label: 'Activos Fijos', icon: Monitor },
                    { id: 'cash', label: 'Caja y Bancos', icon: Wallet },
                    { id: 'transactions', label: 'Transacciones', icon: List },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap",
                            tab === t.id ? "bg-white shadow-sm text-jardin-primary" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Financial Statements Tab */}
            {tab === 'financial' && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Income Statement */}
                    <Card className="space-y-4 border-t-4 border-t-emerald-500">
                        <div className="flex justify-between items-center border-b pb-2">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Estado de Resultados</h3>
                                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Rendimiento</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    className="p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-jardin-primary outline-none"
                                    value={financialMonth ? financialMonth.split('-')[1] : ''}
                                    onChange={(e) => {
                                        const m = e.target.value;
                                        if (!m) {
                                            // Handle clearing month but keeping year? Or enforce pairs. 
                                            // If clearing month, clear whole filter
                                            setFinancialMonth('');
                                            return;
                                        }
                                        const currentY = financialMonth ? financialMonth.split('-')[0] : new Date().getFullYear().toString();
                                        setFinancialMonth(`${currentY}-${m}`);
                                    }}
                                >
                                    <option value="">Mes</option>
                                    {MONTHS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    className="p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-jardin-primary outline-none"
                                    value={financialMonth ? financialMonth.split('-')[0] : new Date().getFullYear().toString()}
                                    onChange={(e) => {
                                        const y = e.target.value;
                                        // If no month selected yet, default to January when year is picked? Or wait for month.
                                        // Let's assume we maintain current month or default to 01 if not set but user is interacting with year?
                                        // Better: If no filter, setting year doesn't enable filter until month is picked.
                                        // BUT logic uses financialMonth string.
                                        // If I change year, I update string. If string was empty?
                                        const currentM = financialMonth ? financialMonth.split('-')[1] : '01';
                                        setFinancialMonth(`${y}-${currentM}`);
                                    }}
                                >
                                    {YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                {financialMonth && (
                                    <button
                                        onClick={() => setFinancialMonth('')}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                        title="Limpiar filtro"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <Row label="(+) Ventas Totales" value={financialData.ventas} bold />
                            <Row label="(-) Costo de Ventas" value={financialData.costos} color="text-red-500" />
                            <div className="border-t border-dashed my-2" />
                            <Row label="= Utilidad Bruta" value={financialData.utilidadBruta} bold />
                            <Row label="(-) Gastos Operativos" value={financialData.gastos} color="text-red-500" />
                            <div className="border-t-2 border-emerald-100 my-2 pt-2" />
                            <div className="flex justify-between items-end font-black text-xl text-jardin-primary bg-emerald-50 p-3 rounded-lg">
                                <span className="text-sm font-bold uppercase text-emerald-800">Utilidad Neta</span>
                                <span>₡{financialData.utilidadNeta.toLocaleString()}</span>
                            </div>
                        </div>
                        {financialMonth && (
                            <div className="text-xs text-center text-gray-400 mt-2">
                                Mostrando datos de {getMonthLabel(financialMonth)}
                            </div>
                        )}
                    </Card>

                    {/* Balance Sheet */}
                    <Card className="space-y-4 border-t-4 border-t-blue-500">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-lg text-gray-800">Balance de Situación</h3>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Posición Actual</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded-lg space-y-2">
                                <div className="font-bold text-gray-500 uppercase text-xs mb-1">Activos (Lo que tengo)</div>
                                <Row label="Caja Chica" value={accounts.caja_chica} />
                                <Row label="Bancos" value={accounts.banco} />
                                <Row label="Inventario" value={accounts.inventario} />
                                <Row label="Activo Fijo" value={accounts.activo_fijo} />
                                <div className="border-t border-gray-200 mt-2 pt-1 flex justify-between font-bold">
                                    <span>Total Activos</span>
                                    <span>₡{totalActivos.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg space-y-2 mt-4">
                                <div className="font-bold text-gray-500 uppercase text-xs mb-1">Patrimonio (Lo que vale)</div>
                                <Row label="Capital Inicial" value={accounts.patrimonio} />
                                <Row label="Utilidad Acumulada" value={utilidadNeta} color={utilidadNeta >= 0 ? 'text-green-600' : 'text-red-500'} />
                                <div className="border-t border-gray-200 mt-2 pt-1 flex justify-between font-bold">
                                    <span>Total Patrimonio</span>
                                    <span>₡{totalPatrimonio.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Inventory Tab */}
            {tab === 'inventory' && (
                <Card className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
                        <h3 className="font-bold text-lg">Reporte de Inventario</h3>
                        <Input
                            placeholder="Buscar por nombre..."
                            value={searchInv}
                            onChange={e => setSearchInv(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 text-xs uppercase">
                                <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-center">Stock</th>
                                    <th className="p-3 text-right">Costo Unit.</th>
                                    <th className="p-3 text-right">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredInventory.map(i => (
                                    <tr key={i.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{i.name}</td>
                                        <td className="p-3 text-center">{i.stock}</td>
                                        <td className="p-3 text-right">₡{i.cost.toLocaleString()}</td>
                                        <td className="p-3 text-right font-bold">₡{(i.stock * i.cost).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {filteredInventory.length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">No se encontraron items.</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={3} className="p-3 text-right">Valor Total Inventario:</td>
                                    <td className="p-3 text-right text-jardin-primary">
                                        ₡{filteredInventory.reduce((acc, i) => acc + (i.stock * i.cost), 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            {/* Assets Tab */}
            {tab === 'assets' && (
                <Card className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
                        <h3 className="font-bold text-lg">Reporte de Activos Fijos</h3>
                        <Input
                            placeholder="Buscar por nombre..."
                            value={searchAsset}
                            onChange={e => setSearchAsset(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 text-xs uppercase">
                                <tr>
                                    <th className="p-3">Activo</th>
                                    <th className="p-3 text-center">Cantidad</th>
                                    <th className="p-3 text-right">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredAssets.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{a.name}</td>
                                        <td className="p-3 text-center">{a.quantity}</td>
                                        <td className="p-3 text-right font-bold">₡{a.value.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {filteredAssets.length === 0 && (
                                    <tr><td colSpan={3} className="p-4 text-center text-gray-400">No se encontraron activos.</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={2} className="p-3 text-right">Total Activos Fijos:</td>
                                    <td className="p-3 text-right text-jardin-primary">
                                        ₡{filteredAssets.reduce((acc, a) => acc + a.value, 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            {/* Cash & Banks Tab */}
            {tab === 'cash' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from- emerald-50 to-white border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><Wallet /></div>
                            <div>
                                <div className="text-sm text-gray-500 uppercase font-bold">Caja Chica</div>
                                <div className="text-2xl font-black text-gray-800">₡{accounts.caja_chica.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400">Efectivo disponible en caja</div>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-white border-l-4 border-l-blue-500">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Wallet /></div>
                            <div>
                                <div className="text-sm text-gray-500 uppercase font-bold">Bancos</div>
                                <div className="text-2xl font-black text-gray-800">₡{accounts.banco.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400">Fondos en cuentas bancarias</div>
                    </Card>

                    <Card className="md:col-span-2">
                        <h3 className="font-bold text-gray-500 uppercase text-xs mb-4">Total Disponibilidad (Liquidez)</h3>
                        <div className="text-4xl font-black text-jardin-primary">
                            ₡{(accounts.caja_chica + accounts.banco).toLocaleString()}
                        </div>
                    </Card>
                </div>
            )}

            {/* Transactions Tab */}
            {tab === 'transactions' && (
                <Card className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end border-b pb-4">
                        <div className="flex flex-wrap gap-4 w-full md:w-auto">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Filtrar por Fecha</label>
                            <div className="flex gap-2">
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto" />
                                <span className="self-center text-gray-400">-</span>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto" />
                            </div>
                        </div>

                        <div className="w-full md:w-48">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tipo Transacción</label>
                            <select
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-jardin-primary"
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                            >
                                <option value="ALL">Todas</option>
                                <option value="SALE">Ventas</option>
                                <option value="PURCHASE">Compras</option>
                                <option value="EXPENSE">Gastos</option>
                                <option value="PRODUCTION">Producción</option>
                                <option value="ADJUSTMENT">Ajustes</option>
                            </select>
                        </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 sticky top-0 z-10 text-xs uppercase">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3">Descripción</th>
                                    <th className="p-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">
                                            No se encontraron transacciones.
                                        </td>
                                    </tr>
                                )}
                                {filteredTransactions.map((t: Transaction) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 text-gray-500 whitespace-nowrap">
                                            {new Date(t.date).toLocaleString()}
                                        </td>
                                        <td className="p-3">
                                            <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider", getTypeColor(t.type))}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="p-3 font-medium text-gray-700">{t.description}</td>
                                        <td className="p-3 text-right font-mono font-bold text-gray-800">
                                            ₡{t.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                        Mostrando {filteredTransactions.length} transacciones
                    </div>
                </Card>
            )}
        </div>
    );
};

const Row = ({ label, value, color, bold }: any) => (
    <div className={cn("flex justify-between items-center py-1", bold && "font-bold text-gray-900", color)}>
        <span className={cn(bold ? "text-base" : "text-gray-600")}>{label}</span>
        <span className="font-mono">{value < 0 ? '(' : ''}₡{Math.abs(value).toLocaleString()}{value < 0 ? ')' : ''}</span>
    </div>
);

const getTypeColor = (t: string) => {
    switch (t) {
        case 'SALE': return "bg-green-100 text-green-700";
        case 'PURCHASE': return "bg-blue-100 text-blue-700";
        case 'EXPENSE': return "bg-red-100 text-red-700";
        case 'PRODUCTION': return "bg-amber-100 text-amber-700";
        case 'ADJUSTMENT': return "bg-purple-100 text-purple-700";
        default: return "bg-gray-100 text-gray-700";
    }
};
