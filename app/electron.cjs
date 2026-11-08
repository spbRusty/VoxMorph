const { app, BrowserWindow, ipcMain, globalShortcut, session } = require('electron');
const path = require('node:path');

if (process.platform === 'linux') app.commandLine.appendSwitch('no-sandbox');

let win;
let obsMode = false;
let lastDragPoint = null;

function setObsMode(enabled) {
  if (!win || win.isDestroyed()) return false;
  obsMode = enabled;
  lastDragPoint = null;
  if (enabled) {
    win.setResizable(false);
    win.setMinimumSize(320, 320);
    win.setSize(720, 720);
    win.center();
    win.setAlwaysOnTop(true, 'screen-saver');
    // Keep mouse input enabled so the transparent avatar can be dragged.
    win.setIgnoreMouseEvents(false);
  } else {
    win.setIgnoreMouseEvents(false);
    win.setAlwaysOnTop(false);
    win.setResizable(true);
    win.setMinimumSize(760, 560);
    win.setSize(1180, 820);
    win.center();
  }
  win.webContents.send('obs-mode-changed', obsMode);
  return obsMode;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 760, minHeight: 560,
    frame: false, transparent: true, backgroundColor: '#00000000',
    hasShadow: false, autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.on('closed', () => { win = null; obsMode = false; });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === 'media'));
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'media');
  ipcMain.handle('voxmorph:toggle-obs', () => setObsMode(!obsMode));
  ipcMain.on('voxmorph:drag-start', (_event, screenX, screenY) => {
    if (!obsMode || !win || win.isDestroyed()) return;
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return;
    lastDragPoint = { x: screenX, y: screenY };
  });
  ipcMain.on('voxmorph:drag-move', (_event, screenX, screenY) => {
    if (!obsMode || !win || win.isDestroyed() || !lastDragPoint) return;
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return;
    const dx = screenX - lastDragPoint.x;
    const dy = screenY - lastDragPoint.y;
    lastDragPoint = { x: screenX, y: screenY };
    if (dx || dy) {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + dx), Math.round(y + dy));
    }
  });
  ipcMain.on('voxmorph:drag-end', () => { lastDragPoint = null; });
  ipcMain.on('voxmorph:minimize', () => win?.minimize());
  ipcMain.on('voxmorph:close', () => win?.close());
  createWindow();
  globalShortcut.register('CommandOrControl+Shift+O', () => setObsMode(!obsMode));
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
