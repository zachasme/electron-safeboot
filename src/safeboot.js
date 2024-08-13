/**
 * Perform the minimum amount of work before real startup:
 * - initialize error reporter (sentry)
 * - ensure single instance
 * - check for updates
 * - test connection to server
 * 
 * Please do _not_ import any code from the main app
 */

const { app, dialog, ipcMain, BrowserWindow } = require("electron")
const { autoUpdater } = require("electron-updater")
const Sentry = require("@sentry/electron/main")
const path = require("node:path")

// Initialize error reporter
Sentry.init({ dsn: "https://f50b4e21428e455b9a922c80e9508945@o321544.ingest.sentry.io/1815876" });

// Ensure applicaton is not already running
if (false === app.requestSingleInstanceLock()) {
  dialog.showErrorBox("Error", "Application is already running")
  return app.quit()
}

// Show errors but always keep launching
safeboot().catch((error) => {
  dialog.showErrorBox("Update error", `Something went wrong while checking for updates. If the problem persists, try manually installing the latest version.\n\nIn case you're curious, the error is: "${error.message}"\n\nThe application will now launch anyway.`)
}).then((window) => {
  // Import errors are gobbled without this seemingly useless try-catch
  try { require('./main.js')(() => window?.close()) } catch (error) { console.error(error) }
})

async function safeboot() {
  // Create boot window
  await app.whenReady()
  const window = new BrowserWindow({
    width: 500, height: 500, show: false,
    center: true, frame: false, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'safeboot/preload.js') }
  })
  await window.loadFile("src/safeboot/index.html")
  window.webContents.on("will-navigate", (event) => event.preventDefault())
  window.show()

  try {
    if(app.commandLine.hasSwitch("force-safeboot-error")) throw new Error("Forced safeboot error using commandline switch")

    // STEP 1: Check for (and download) updates
    window.webContents.send('status', "Checking for update")
    await new Promise(async (resolve, reject) => {
      if(app.commandLine.hasSwitch("prerelease")) autoUpdater.allowPrerelease = true
      autoUpdater.on("update-not-available", () => resolve())
      autoUpdater.on("error", (error) => reject(error))
      autoUpdater.on("update-available", (update) => {
        window.webContents.send('status', `Update ${update.version} available!`)
      })
      autoUpdater.on("download-progress", (progress) => {
        window.webContents.send('status', `Downloading update… (${progress.percent.toFixed(0)}%)`)
      })
      autoUpdater.on("update-downloaded", () => autoUpdater.quitAndInstall())
      const update = await autoUpdater.checkForUpdates()
      if (!update) resolve() // instantly resolve in development
    })
    autoUpdater.removeAllListeners()

    // STEP 2: Ensure server is reachable
    window.webContents.send('status', "Checking connection")
    try {
      const response = await fetch("https://www.electronjs.org")
      if (response.status !== 200) throw new Error("Status not OK")
    } catch (error) {
      console.error(error)
      throw new Error("Can't connect to server")
    }
  } catch (error) {
    // ERROR: Show message and allow user to forcefully launch
    window.webContents.send('error', error.message)
    await new Promise(resolve => ipcMain.once("launch", resolve))
  }

  // I prefer the real app.
  window.webContents.send('status', "Launching…")
  // I said, the *real* app.
  return window
  // Perfection.
}
