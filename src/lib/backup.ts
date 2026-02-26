export const backupManager = {
    // Basic detection for Electron (Node.js environment)
    isElectron: () => {
        return typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
    },

    saveDailyBackup: async (statePayload: any) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const backupName = `jardin-erp-backup-${today}.json`;

        if (backupManager.isElectron()) {
            await backupManager.saveElectronBackup(backupName, statePayload);
        } else {
            await backupManager.saveIndexedDBBackup(backupName, statePayload);
        }
    },

    // ---------------------------------------------------------
    // ELECTRON (Node.js) FILE SYSTEM BACKUP
    // ---------------------------------------------------------
    saveElectronBackup: async (filename: string, payload: any) => {
        try {
            // Because we have nodeIntegration: true and contextIsolation: false, we can dynamically require
            const fs = (window as any).require('fs');
            const path = (window as any).require('path');
            const { app } = (window as any).require('@electron/remote') || (window as any).require('electron');

            // Find the user's Application Support folder (or fallback to a local 'backups' dir)
            const userDataPath = app ? app.getPath('userData') : (window as any).process.cwd();
            const backupDir = path.join(userDataPath, 'backups');

            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const filepath = path.join(backupDir, filename);

            // Skip if today's backup already exists
            if (fs.existsSync(filepath)) return;

            fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');

            // Enforce 10 day limit
            const files = fs.readdirSync(backupDir)
                .filter((f: string) => f.endsWith('.json'))
                .map((f: string) => ({
                    name: f,
                    path: path.join(backupDir, f),
                    time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
                }))
                .sort((a: any, b: any) => b.time - a.time); // Newest first

            if (files.length > 10) {
                // Delete everything older than the 10th newest file
                for (let i = 10; i < files.length; i++) {
                    fs.unlinkSync(files[i].path);
                }
            }
        } catch (error) {
            console.error("Electron File Backup Failed:", error);
        }
    },

    getElectronBackups: async () => {
        try {
            const fs = (window as any).require('fs');
            const path = (window as any).require('path');
            const { app } = (window as any).require('@electron/remote') || (window as any).require('electron');
            const userDataPath = app ? app.getPath('userData') : (window as any).process.cwd();
            const backupDir = path.join(userDataPath, 'backups');

            if (!fs.existsSync(backupDir)) return [];

            const files = fs.readdirSync(backupDir)
                .filter((f: string) => f.endsWith('.json'))
                .sort((a: string, b: string) => b.localeCompare(a)); // Sort by filename (date descending)

            return files.map((filename: string) => ({
                id: filename,
                date: filename.replace('jardin-erp-backup-', '').replace('.json', ''),
                source: 'FILE_SYSTEM'
            }));
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    restoreElectronBackup: async (filename: string): Promise<any> => {
        const fs = (window as any).require('fs');
        const path = (window as any).require('path');
        const { app } = (window as any).require('@electron/remote') || (window as any).require('electron');
        const userDataPath = app ? app.getPath('userData') : (window as any).process.cwd();
        const filepath = path.join(userDataPath, 'backups', filename);

        const content = fs.readFileSync(filepath, 'utf-8');
        return JSON.parse(content);
    },

    openElectronBackupFolder: () => {
        const { shell } = (window as any).require('electron');
        const path = (window as any).require('path');
        const { app } = (window as any).require('@electron/remote') || (window as any).require('electron');
        const userDataPath = app ? app.getPath('userData') : (window as any).process.cwd();
        shell.openPath(path.join(userDataPath, 'backups'));
    },


    // ---------------------------------------------------------
    // BROWSER (IndexedDB) FALLBACK BACKUP
    // ---------------------------------------------------------
    initDB: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('JardinBackupsDB', 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('backups')) {
                    db.createObjectStore('backups', { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    saveIndexedDBBackup: async (filename: string, payload: any) => {
        const db = await backupManager.initDB();

        // Check if exists
        const exists = await new Promise((resolve) => {
            const tx = db.transaction('backups', 'readonly');
            const store = tx.objectStore('backups');
            const req = store.get(filename);
            req.onsuccess = () => resolve(req.result !== undefined);
        });

        if (exists) return; // Already backed up today

        // Save
        const dateStr = filename.replace('jardin-erp-backup-', '').replace('.json', '');
        await new Promise((resolve, reject) => {
            const tx = db.transaction('backups', 'readwrite');
            const store = tx.objectStore('backups');
            store.put({ id: filename, date: dateStr, data: payload, timestamp: Date.now() });
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });

        // Enforce 10 day limit
        await new Promise((resolve) => {
            const tx = db.transaction('backups', 'readwrite');
            const store = tx.objectStore('backups');
            const req = store.getAll();
            req.onsuccess = () => {
                const records = req.result;
                records.sort((a, b) => b.timestamp - a.timestamp); // Newest first

                if (records.length > 10) {
                    for (let i = 10; i < records.length; i++) {
                        store.delete(records[i].id);
                    }
                }
                resolve(true);
            };
        });
    },

    getIndexedDBBackups: async () => {
        try {
            const db = await backupManager.initDB();
            return new Promise<any[]>((resolve) => {
                const tx = db.transaction('backups', 'readonly');
                const store = tx.objectStore('backups');
                const req = store.getAll();
                req.onsuccess = () => {
                    const records = req.result.map(r => ({
                        id: r.id,
                        date: r.date,
                        source: 'INDEXED_DB'
                    }));
                    records.sort((a, b) => b.date.localeCompare(a.date));
                    resolve(records);
                };
            });
        } catch (e) {
            return [];
        }
    },

    restoreIndexedDBBackup: async (filename: string): Promise<any> => {
        const db = await backupManager.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('backups', 'readonly');
            const store = tx.objectStore('backups');
            const req = store.get(filename);
            req.onsuccess = () => resolve(req.result?.data);
            req.onerror = () => reject("Backup not found");
        });
    }
};
