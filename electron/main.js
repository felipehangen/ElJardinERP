import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simple local apps. For strict security, use preload.
        },
        title: "El Jardín ERP",
        backgroundColor: '#F3F4F6' // jardin-bg
    });

    // Check if we are in dev mode
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
