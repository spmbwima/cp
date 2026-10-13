const { contextBridge, ipcRenderer } = require('electron');

// Jembatan aman antara halaman (index.html) dan penyimpanan file di komputer.
contextBridge.exposeInMainWorld('desktop', {
  load: () => ipcRenderer.invoke('pv:load'),
  save: (key, value) => ipcRenderer.invoke('pv:save', key, value),
  openDataDir: () => ipcRenderer.invoke('pv:openDataDir')
});
