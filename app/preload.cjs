const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voxmorph', {
  toggleObsMode: () => ipcRenderer.invoke('voxmorph:toggle-obs'),
  moveWindowBy: (dx, dy) => ipcRenderer.send('voxmorph:move-window', dx, dy),
  minimize: () => ipcRenderer.send('voxmorph:minimize'),
  close: () => ipcRenderer.send('voxmorph:close'),
  onObsModeChanged: (callback) => {
    ipcRenderer.on('obs-mode-changed', (_event, enabled) => callback(enabled));
  },
});
