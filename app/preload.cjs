const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voxmorph', {
  toggleObsMode: () => ipcRenderer.invoke('voxmorph:toggle-obs'),
  beginWindowDrag: (x, y) => ipcRenderer.send('voxmorph:drag-start', x, y),
  moveWindowDrag: (x, y) => ipcRenderer.send('voxmorph:drag-move', x, y),
  endWindowDrag: () => ipcRenderer.send('voxmorph:drag-end'),
  minimize: () => ipcRenderer.send('voxmorph:minimize'),
  close: () => ipcRenderer.send('voxmorph:close'),
  onObsModeChanged: (callback) => {
    ipcRenderer.on('obs-mode-changed', (_event, enabled) => callback(enabled));
  },
});
