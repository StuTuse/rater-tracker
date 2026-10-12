const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  info: () => ipcRenderer.invoke('desktop:info'),
  openData: () => ipcRenderer.invoke('desktop:open-data'),
  exportBackup: (text, name) => ipcRenderer.invoke('desktop:export', text, name),
  importBackup: () => ipcRenderer.invoke('desktop:import')
});
