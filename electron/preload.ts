import { ipcRenderer, contextBridge } from "electron"

type UpdateInfo = {
  version: string
  releaseDate: string
}

type ExposedAPI = {
  on: (channel: string, listener: (...args: any[]) => void) => void
  off: (channel: string, listener: (...args: any[]) => void) => void
  send: (channel: string, ...args: any[]) => void
  invoke: (channel: string, ...args: any[]) => Promise<any>

  onUpdateChecking: (callback: () => void) => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateDownloadProgress: (
    callback: (progressObj: { percent: number }) => void
  ) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  onUpdateInstallFailed: (callback: () => void) => void
  onUpdateError: (callback: (message: string) => void) => void
  checkForUpdates: () => Promise<void>
  startDownload: () => Promise<void>
  installUpdate: () => Promise<void>
}

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
})

const exposedAPI: ExposedAPI = {
  on(channel, listener) {
    const wrappedListener = (
      _event: Electron.IpcRendererEvent,
      ...args: any[]
    ) => listener(...args)
    ipcRenderer.on(channel, wrappedListener)
    return () => ipcRenderer.removeListener(channel, wrappedListener)
  },
  off(channel, listener) {
    ipcRenderer.removeListener(channel, listener)
  },
  send(channel, ...args) {
    ipcRenderer.send(channel, ...args)
  },
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args)
  },

  onUpdateChecking(callback) {
    ipcRenderer.on("update_checking", callback)
  },
  onUpdateAvailable(callback) {
    ipcRenderer.on("update_available", (_event, info) => callback(info))
  },
  onUpdateNotAvailable(callback) {
    ipcRenderer.on("update_not_available", (_event, info) => callback(info))
  },
  onUpdateDownloadProgress(callback) {
    ipcRenderer.on("update_download_progress", (_event, progressObj) =>
      callback(progressObj)
    )
  },
  onUpdateDownloaded(callback) {
    ipcRenderer.on("update_downloaded", (_event, info) => callback(info))
  },
  onUpdateInstallFailed(callback) {
    ipcRenderer.on("update_install_failed", callback)
  },
  onUpdateError(callback) {
    ipcRenderer.on("update_error", (_event, message) => callback(message))
  },
  checkForUpdates() {
    return ipcRenderer.invoke("check-for-updates")
  },
  startDownload() {
    return ipcRenderer.invoke("start-download")
  },
  installUpdate() {
    return ipcRenderer.invoke("install-update")
  },
}

contextBridge.exposeInMainWorld("ipcRenderer", exposedAPI)

export {}
