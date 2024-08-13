const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld('bridge', {
  onStatus: (callback) => ipcRenderer.on("status", (_, value) => callback(value)),
  onError: (callback) => ipcRenderer.on("error", (_, value) => callback(value)),
  launch: () => ipcRenderer.send("launch")
})