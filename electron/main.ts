import { app, BrowserWindow, ipcMain, Notification } from "electron"
import { autoUpdater } from "electron-updater"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const packageJsonPath = path.join(__dirname, "../package.json")
let appVersion = "unknown"

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  appVersion = packageJson.version
} catch (error) {
  console.error("Error reading package.json:", error)
}

process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.mjs"),
      sandbox: false,
    },
  })


  if (VITE_DEV_SERVER_URL) {
    console.log("Loading from dev server:", VITE_DEV_SERVER_URL)
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    console.log("Loading from file:", path.join(RENDERER_DIST, "index.html"))
    win.loadFile(path.join(RENDERER_DIST, "index.html"))
  }
}

ipcMain.handle("get-app-version", () => {
  return appVersion
})

autoUpdater.setFeedURL({
  provider: "github",
  owner: "joel-hales",
  repo: "electron-updater-hello-world",
})

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  if (process.env.GH_TOKEN) {
    autoUpdater.requestHeaders = { Authorization: `token ${process.env.GH_TOKEN}` };
    console.log("GitHub token set in autoUpdater")
  } else {
    console.warn("GH_TOKEN is not set");
  }

  autoUpdater.on("checking-for-update", () => {
    win?.webContents.send("update_checking")
  })

  autoUpdater.on("update-available", (info) => {
    win?.webContents.send("update_available", info)
    new Notification({
      title: "Update Available",
      body: `A new version (${info.version}) is available. Would you like to download it?`,
    }).show()
  })

  autoUpdater.on("update-not-available", (info) => {
    win?.webContents.send("update_not_available", info)
  })

  autoUpdater.on("download-progress", (progressObj) => {
    win?.webContents.send("update_download_progress", progressObj)
  })

  autoUpdater.on("update-downloaded", (info) => {
    win?.webContents.send("update_downloaded", info)
    new Notification({
      title: "Update Ready",
      body: "Update downloaded. Ready to install.",
    }).show()
  })

  autoUpdater.on("error", (err) => {
    console.error("Error in auto-updater:", err)
    win?.webContents.send("update_error", err.message)
  })

  // Check for updates every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("Error checking for updates:", err)
    })
  }, 30 * 60 * 1000)

  autoUpdater.checkForUpdates().catch((err) => {
    console.error("Error in initial update check:", err)
  })
}

function setupIpcHandlers() {
  ipcMain.handle("start-download", () => {
    return autoUpdater.downloadUpdate().catch((err) => {
      console.error("Error downloading update:", err)
      throw err
    })
  })

  ipcMain.handle("install-update", () => {
    if (autoUpdater.isUpdaterActive()) {
      autoUpdater.quitAndInstall(false, true)
    } else {
      win?.webContents.send("update_install_failed")
    }
  })

  ipcMain.handle("check-for-updates", () => {
    if (process.env.NODE_ENV !== "development") {
      return autoUpdater.checkForUpdates().catch((err) => {
        console.error("Error checking for updates:", err)
        throw err
      })
    }
  })

  ipcMain.handle("get-app-version", () => {
    return appVersion
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
    win = null
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  app.commandLine.appendSwitch('disable-http-cache')
  createWindow()
  setupIpcHandlers()

  if (process.env.NODE_ENV === "development") {
    setInterval(() => {
      if (win && !win.isFocused()) {
        win.focus()
      }
    }, 1000)
  } else {
    setupAutoUpdater()
  }
})
