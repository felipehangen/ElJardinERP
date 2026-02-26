import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Button, Card, Input } from './ui';
import { Download, Upload, Trash2, RotateCcw, FolderOpen } from 'lucide-react';
import { SystemAuditTest } from './SystemAuditTest';
import { backupManager } from '../lib/backup';

import { getAccountingDocumentation } from '../lib/accountingDocs';

export const Settings = () => {
    const { importState, reset } = useStore();
    const fileRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        const state = useStore.getState();
        const exportPayload = {
            ...state,
            documentacion_contable: getAccountingDocumentation()
        };
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
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

    const [autoBackups, setAutoBackups] = useState<any[]>([]);

    useEffect(() => {
        const fetchAuto = async () => {
            if (backupManager.isElectron()) {
                setAutoBackups(await backupManager.getElectronBackups());
            } else {
                setAutoBackups(await backupManager.getIndexedDBBackups());
            }
        };
        fetchAuto();
    }, []);

    const handleDownloadAutoBackup = async (id: string, source: string) => {
        try {
            let payload = null;
            if (source === 'FILE_SYSTEM') {
                payload = await backupManager.restoreElectronBackup(id);
            } else {
                payload = await backupManager.restoreIndexedDBBackup(id);
            }

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = id; // id is already the filename like jardin-erp-backup-YYYY-MM-DD.json
            a.click();
        } catch (e) {
            alert("Error al descargar respaldo automático.");
        }
    };

    const handleRestoreAutoBackup = async (id: string, source: string) => {
        try {
            if (window.confirm(`¿Estás seguro que deseas restaurar el sistema al día ${id}? ¡Esto borrará los datos actuales por completo!`)) {
                let payload = null;
                if (source === 'FILE_SYSTEM') {
                    payload = await backupManager.restoreElectronBackup(id);
                } else {
                    payload = await backupManager.restoreIndexedDBBackup(id);
                }
                importState(payload);
                alert("Sistema restaurado con éxito desde el respaldo automático.");
                window.location.reload();
            }
        } catch (e) {
            alert("Error al restaurar respaldo automático.");
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState('');

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
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Copias de Seguridad Automáticas</h3>
                    {backupManager.isElectron() && (
                        <Button variant="outline" size="sm" onClick={() => backupManager.openElectronBackupFolder()}>
                            <FolderOpen className="mr-2" size={16} /> Abrir Carpeta
                        </Button>
                    )}
                </div>
                <div className="space-y-2">
                    {autoBackups.length === 0 ? (
                        <p className="text-gray-500 text-sm bg-gray-50 p-4 border rounded-lg">Aún no hay respaldos automáticos. El sistema tomará una foto invisible de la base de datos una vez al día.</p>
                    ) : (
                        autoBackups.map(bkp => (
                            <div key={bkp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-white transition-colors">
                                <div>
                                    <p className="font-medium text-gray-800">{bkp.date}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">[{bkp.source === 'FILE_SYSTEM' ? 'Alojado en App Mac' : 'Alojado en Navegador'}] {bkp.id}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleDownloadAutoBackup(bkp.id, bkp.source)}>
                                        <Download size={14} />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRestoreAutoBackup(bkp.id, bkp.source)} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                                        <RotateCcw size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="pt-8 border-t">
                <h3 className="font-bold text-red-600 mb-4">Zona de Peligro</h3>
                <div className="bg-red-50 p-4 rounded-xl space-y-4 border border-red-100">
                    <p className="text-sm text-red-800">
                        Esta acción borrará <strong>todos</strong> los datos y no se puede deshacer.
                        Escribe <strong>BORRAR</strong> para confirmar.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder='Escribe "BORRAR"'
                            className="bg-white border-red-200 focus:border-red-500 focus:ring-red-200"
                        />
                        <Button
                            variant="danger"
                            disabled={deleteConfirm !== 'BORRAR'}
                            onClick={() => {
                                try {
                                    reset();
                                    window.localStorage.clear();
                                    window.localStorage.removeItem('jardin-erp-storage-v4');
                                    alert('¡Datos eliminados correctamente! El sistema se reiniciará.');
                                    setTimeout(() => window.location.reload(), 500);
                                } catch (e) {
                                    alert('Error eliminando datos: ' + e);
                                }
                            }}
                        >
                            <Trash2 className="mr-2" size={18} /> Reiniciar de Fábrica
                        </Button>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t">
                <SystemAuditTest />
            </div>
        </Card>
    );
};
