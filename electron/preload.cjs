const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  accountCurrent: () => ipcRenderer.invoke('account:current'),
  accountLogin: (username, password) => ipcRenderer.invoke('account:login', username, password),
  accountRegister: values => ipcRenderer.invoke('account:register', values),
  accountVerifyRegistration: (id, code) => ipcRenderer.invoke('account:verify-registration', id, code),
  accountLogout: () => ipcRenderer.invoke('account:logout'),
  accountSync: data => ipcRenderer.invoke('account:sync', data),
  info: () => ipcRenderer.invoke('desktop:info'),
  openData: () => ipcRenderer.invoke('desktop:open-data'),
  exportBackup: (text, name) => ipcRenderer.invoke('desktop:export', text, name),
  importBackup: () => ipcRenderer.invoke('desktop:import')
});
