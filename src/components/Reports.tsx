import { useStore } from '../store/useStore';
import { Card, cn } from './ui';

export const Reports = () => {
    const { accounts, transactions } = useStore();

    if (!accounts) return <div>Cargando cuentas...</div>;
    const safeTransactions = transactions || [];

    // Derived values
    const totalActivos = accounts.caja_chica + accounts.banco + accounts.inventario + accounts.activo_fijo;
    const utilidadBruta = accounts.ventas - accounts.costos;
    const utilidadNeta = utilidadBruta - accounts.gastos;
    const totalPatrimonio = accounts.patrimonio + utilidadNeta;

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Balance Sheet */}
            <Card className="space-y-4">
                <h3 className="font-bold text-lg text-jardin-primary border-b pb-2">Balance de Situación</h3>
                <div className="space-y-2 text-sm">
                    <div className="font-bold text-gray-500 uppercase text-xs">Activos</div>
                    <Row label="Caja Chica" value={accounts.caja_chica} />
                    <Row label="Bancos" value={accounts.banco} />
                    <Row label="Inventario" value={accounts.inventario} />
                    <Row label="Activo Fijo" value={accounts.activo_fijo} />
                    <div className="pt-2 border-t flex justify-between font-bold text-base">
                        <span>Total Activos</span>
                        <span>₡{totalActivos.toLocaleString()}</span>
                    </div>

                    <div className="font-bold text-gray-500 uppercase text-xs mt-4">Patrimonio</div>
                    <Row label="Capital Social" value={accounts.patrimonio} />
                    <Row label="Utilidad del Periodo" value={utilidadNeta} color={utilidadNeta >= 0 ? 'text-green-600' : 'text-red-500'} />
                    <div className="pt-2 border-t flex justify-between font-bold text-base">
                        <span>Total Patrimonio</span>
                        <span>₡{totalPatrimonio.toLocaleString()}</span>
                    </div>
                </div>
            </Card>

            {/* Income Statement */}
            <Card className="space-y-4">
                <h3 className="font-bold text-lg text-emerald-600 border-b pb-2">Estado de Resultados</h3>
                <div className="space-y-3 text-sm">
                    <Row label="(+) Ventas Totales" value={accounts.ventas} bold />
                    <Row label="(-) Costo de Ventas" value={accounts.costos} color="text-red-500" />
                    <div className="border-t border-dashed my-2" />
                    <Row label="= Utilidad Bruta" value={utilidadBruta} bold />
                    <Row label="(-) Gastos Operativos" value={accounts.gastos} color="text-red-500" />
                    <div className="border-t-2 border-emerald-100 my-2 pt-2" />
                    <div className="flex justify-between font-black text-xl text-jardin-primary">
                        <span>Utilidad Neta</span>
                        <span>₡{utilidadNeta.toLocaleString()}</span>
                    </div>
                </div>
            </Card>

            {/* Sales Log */}
            <Card className="lg:col-span-2">
                <h3 className="font-bold text-lg mb-4">Registro de Transacciones Recientes</h3>
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-400 border-b sticky top-0 bg-white">
                            <tr>
                                <th className="py-2">Fecha</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th className="text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {safeTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="py-3">{new Date(t.date).toLocaleDateString()}</td>
                                    <td><span className={cn("px-2 py-1 rounded text-xs font-bold", getTypeColor(t.type))}>{t.type}</span></td>
                                    <td>{t.description}</td>
                                    <td className="text-right font-mono">₡{t.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const Row = ({ label, value, color, bold }: any) => (
    <div className={cn("flex justify-between", bold && "font-bold", color)}>
        <span>{label}</span>
        <span>{value < 0 ? '(' : ''}₡{Math.abs(value).toLocaleString()}{value < 0 ? ')' : ''}</span>
    </div>
);

const getTypeColor = (t: string) => {
    switch (t) {
        case 'SALE': return "bg-green-100 text-green-700";
        case 'PURCHASE': return "bg-blue-100 text-blue-700";
        case 'EXPENSE': return "bg-red-100 text-red-700";
        default: return "bg-gray-100 text-gray-700";
    }
};
