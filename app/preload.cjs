const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voxmorph', {
  toggleObsMode: () => ipcRenderer.invoke('voxmorph:toggle-obs'),
  resizeWindowTo: (width, height) => ipcRenderer.send('voxmorph:resize-window-to', width, height),
  minimize: () => ipcRenderer.send('voxmorph:minimize'),
  close: () => ipcRenderer.send('voxmorph:close'),
  onObsModeChanged: (callback) => {
    ipcRenderer.on('obs-mode-changed', (_event, enabled) => callback(enabled));
  },
});
