import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Button, Card } from './ui';
import { Download, Upload, Trash2 } from 'lucide-react';

export const Settings = () => {
    const { importState, reset } = useStore();
    const fileRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        const state = useStore.getState();
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jardin-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (window.confirm("¿Sobrescribir datos actuales con este respaldo?")) {
                    importState(data);
                    alert("Datos restaurados.");
                }
            } catch (err) {
                alert("Error al leer archivo.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <Card className="max-w-xl mx-auto space-y-8">
            <div>
                <h3 className="font-bold text-lg mb-4">Gestión de Datos</h3>
                <div className="flex gap-4">
                    <Button onClick={handleBackup} className="flex-1 bg-sky-600 hover:bg-sky-700">
                        <Download className="mr-2" size={18} /> Descargar Respaldo
                    </Button>
                    <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
                        <Upload className="mr-2" size={18} /> Importar Respaldo
                    </Button>
                    <input type="file" ref={fileRef} onChange={handleRestore} accept=".json" className="hidden" />
                </div>
            </div>

            <div className="pt-8 border-t">
                <h3 className="font-bold text-red-600 mb-2">Zona de Peligro</h3>
                <Button variant="danger" className="w-full" onClick={() => { if (window.confirm("¿SEGURO? Se perderá todo.")) { reset(); window.location.reload(); } }}>
                    <Trash2 className="mr-2" size={18} /> Reiniciar de Fábrica
                </Button>
            </div>
        </Card>
    );
};
