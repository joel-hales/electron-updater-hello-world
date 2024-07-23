import { useState, useEffect, useCallback } from "react"
import { IpcRenderer, IpcRendererEvent } from "electron"

interface UpdateInfo {
  version: string
  releaseDate: string
}

interface UpdateProgressInfo {
  percent: number
}

// Augment the existing Window interface
declare global {
  interface Window {
    ipcRenderer: IpcRenderer
  }
}

export function UpdateHandler() {
  const [updateStatus, setUpdateStatus] = useState<string>("")
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleUpdateChecking = (_event: IpcRendererEvent) => {
      setUpdateStatus("Checking for updates...")
      setError(null)
    }

    const handleUpdateAvailable = (
      _event: IpcRendererEvent,
      info: UpdateInfo
    ) => {
      setUpdateStatus(`Update available: ${info.version}`)
      setUpdateInfo(info)
      setError(null)
    }

    const handleUpdateNotAvailable = (_event: IpcRendererEvent) => {
      setUpdateStatus("No updates available")
      setError(null)
    }

    const handleUpdateDownloadProgress = (
      _event: IpcRendererEvent,
      progressObj: UpdateProgressInfo
    ) => {
      setDownloadProgress(progressObj.percent)
      setError(null)
    }

    const handleUpdateDownloaded = (
      _event: IpcRendererEvent,
      info: UpdateInfo
    ) => {
      setUpdateStatus(`Update downloaded. Version: ${info.version}`)
      setUpdateDownloaded(true)
      setError(null)
    }

    const handleUpdateInstallFailed = (_event: IpcRendererEvent) => {
      setUpdateStatus(
        "Update installation failed. Please restart the app and try again."
      )
      setIsUpdating(false)
      setError("Installation failed")
    }

    const handleUpdateError = (_event: IpcRendererEvent, message: string) => {
      setError(message)
      setIsUpdating(false)
    }

    window.ipcRenderer.on("update_checking", handleUpdateChecking)
    window.ipcRenderer.on("update_available", handleUpdateAvailable)
    window.ipcRenderer.on("update_not_available", handleUpdateNotAvailable)
    window.ipcRenderer.on(
      "update_download_progress",
      handleUpdateDownloadProgress
    )
    window.ipcRenderer.on("update_downloaded", handleUpdateDownloaded)
    window.ipcRenderer.on("update_install_failed", handleUpdateInstallFailed)
    window.ipcRenderer.on("update_error", handleUpdateError)

    return () => {
      window.ipcRenderer.removeListener("update_checking", handleUpdateChecking)
      window.ipcRenderer.removeListener(
        "update_available",
        handleUpdateAvailable
      )
      window.ipcRenderer.removeListener(
        "update_not_available",
        handleUpdateNotAvailable
      )
      window.ipcRenderer.removeListener(
        "update_download_progress",
        handleUpdateDownloadProgress
      )
      window.ipcRenderer.removeListener(
        "update_downloaded",
        handleUpdateDownloaded
      )
      window.ipcRenderer.removeListener(
        "update_install_failed",
        handleUpdateInstallFailed
      )
      window.ipcRenderer.removeListener("update_error", handleUpdateError)
    }
  }, [])

  const handleCheckForUpdates = useCallback(() => {
    window.ipcRenderer.invoke("check-for-updates").catch(console.error)
  }, [])

  const handleDownload = useCallback(() => {
    window.ipcRenderer.invoke("start-download").catch(console.error)
    setUpdateStatus("Downloading update...")
    setError(null)
  }, [])

  const handleInstall = useCallback(() => {
    setIsUpdating(true)
    setUpdateStatus("Installing update...")
    setError(null)
    window.ipcRenderer.invoke("install-update").catch(console.error)
  }, [])

  return (
    <div className="update-handler">
      <p className="update-status">{updateStatus}</p>
      {error && <p className="error-message">Error: {error}</p>}
      {downloadProgress > 0 && (
        <progress
          className="download-progress"
          value={downloadProgress}
          max={100}
        />
      )}
      <div className="update-actions">
        <button onClick={handleCheckForUpdates}>Check for Updates</button>
        {updateInfo && !updateDownloaded && (
          <button onClick={handleDownload}>Download Update</button>
        )}
        {updateDownloaded && !isUpdating && (
          <button onClick={handleInstall}>Install Update</button>
        )}
      </div>
      {isUpdating && (
        <p className="updating-message">Update in progress... Please wait.</p>
      )}
    </div>
  )
}
