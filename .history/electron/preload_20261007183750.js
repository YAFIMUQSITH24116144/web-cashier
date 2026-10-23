import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kasirAPI', {
  getMenus: () => ipcRenderer.invoke('menus:get-all'),

  getCategories: () => ipcRenderer.invoke('categories:get-all'),

  createOrder: (order) =>
    ipcRenderer.invoke('orders:create', order),

  getOrders: () =>
    ipcRenderer.invoke('orders:get-all'),

  payOrder: (payment) =>
    ipcRenderer.invoke('orders:pay', payment),

  getSettings: () =>
    ipcRenderer.invoke('settings:get'),

  updateSettings: (settings) =>
    ipcRenderer.invoke('settings:update', settings),
});