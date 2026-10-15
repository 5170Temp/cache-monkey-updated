const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow } = require('electron');

const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  const profile = path.join(app.getPath('appData'), `${app.getName()}-development`);
  fs.mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
}

if (app.requestSingleInstanceLock()) {
  startApp();
} else {
  app.quit();
}

function startApp() {
  const remote = require('@electron/remote/main');
  const { autoUpdater } = require('electron-updater');

  remote.initialize();

  let mainWindow;
  app.updateDownloaded = false;
  app.updateDownloading = false;
  app.updateFailed = false;
  autoUpdater.allowDowngrade = false;

  function createWindow() {
    mainWindow = new BrowserWindow({
      height: 619,
      useContentSize: true,
      width: 1093,
      frame: false,
      title: 'CacheMonkey',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: !isDevelopment
      }
    });
    remote.enable(mainWindow.webContents);
    if (isDevelopment) {
      mainWindow.loadURL('http://127.0.0.1:9080');
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../dist/electron/index.html'));
    }
    mainWindow.on('closed', () => { mainWindow = null; });
  }

  app.whenReady().then(() => {
    createWindow();
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch(error => console.error('Update check failed', error));
      setInterval(() => {
        autoUpdater.checkForUpdates().catch(error => console.error('Update check failed', error));
      }, 1800000);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  autoUpdater.on('update-available', () => {
    app.updateDownloading = true;
    app.updateFailed = false;
  });

  autoUpdater.on('update-downloaded', () => {
    app.updateDownloaded = true;
    app.updateDownloading = false;
    app.updateFailed = false;
  });

  autoUpdater.on('update-not-available', () => {
    app.updateDownloading = false;
    app.updateFailed = false;
  });

  autoUpdater.on('error', error => {
    console.error('Update failed', error);
    app.updateDownloading = false;
    app.updateFailed = true;
  });

  app.reloadApp = () => {
    if (app.updateDownloaded) autoUpdater.quitAndInstall();
  };
}
