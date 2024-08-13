const { BrowserWindow } = require("electron");

module.exports = async function main(onMainWindowShown) {
  // hide main window until fully loaded
  const window = new BrowserWindow({ show: false });

  try {
    await window.loadURL("https://www.electronjs.org");
  } catch (error) {
    console.error(error)
  } finally {
    // swap boot and main window
    window.show()
    onMainWindowShown()
  }

  return window
}