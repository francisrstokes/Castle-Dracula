const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('bridge', {
  setSize: (width, height) => {
    ipcRenderer.send('set-size', width, height);
  }
});
