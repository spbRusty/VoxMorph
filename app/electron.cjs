const { app, BrowserWindow, ipcMain, globalShortcut, session } = require('electron');
const path = require('node:path');

if (process.platform === 'linux') app.commandLine.appendSwitch('no-sandbox');

let win;
let obsMode = false;

function setObsMode(enabled) {
  if (!win || win.isDestroyed()) return false;
  obsMode = enabled;
  if (enabled) {
    win.setResizable(true);
    win.setMinimumSize(240, 240);
    win.setSize(720, 720);
    win.center();
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.moveTop();
    // Keep mouse input enabled so the transparent avatar can be dragged.
    win.setIgnoreMouseEvents(false);
  } else {
    win.setIgnoreMouseEvents(false);
    win.setVisibleOnAllWorkspaces(false);
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
  win.on('blur', () => { if (obsMode && !win.isDestroyed()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } });
  win.on('show', () => { if (obsMode && !win.isDestroyed()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } });
  win.on('closed', () => { win = null; obsMode = false; });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === 'media'));
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'media');
  ipcMain.handle('voxmorph:toggle-obs', () => setObsMode(!obsMode));
  ipcMain.on('voxmorph:resize-window-to', (_event, width, height) => {
    if (!obsMode || !win || win.isDestroyed()) return;
    const nextWidth = Math.max(240, Math.min(1200, Math.round(Number(width) || 720)));
    const nextHeight = Math.max(240, Math.min(1200, Math.round(Number(height) || 720)));
    win.setBounds({ x: win.getBounds().x, y: win.getBounds().y, width: nextWidth, height: nextHeight });
  });
  ipcMain.on('voxmorph:minimize', () => win?.minimize());
  ipcMain.on('voxmorph:close', () => win?.close());
  createWindow();
  globalShortcut.register('CommandOrControl+Shift+O', () => setObsMode(!obsMode));
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
