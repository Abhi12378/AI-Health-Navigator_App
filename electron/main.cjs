const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');

let mainWindow = null;

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode && res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, attempts = 60, delayMs = 500) {
  for (let index = 0; index < attempts; index += 1) {
    const ready = await checkServerReady(url);
    if (ready) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function startBackendServer() {
  const serverEntry = path.join(__dirname, '..', 'electron-dist', 'server.mjs');
  process.env.NODE_ENV = 'production';
  process.env.PORT = process.env.PORT || '3000';

  const serverModule = await import(pathToFileURL(serverEntry).href);
  if (typeof serverModule.startServer !== 'function') {
    throw new Error('startServer export was not found in electron backend bundle.');
  }
  await serverModule.startServer();
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'stethoscope.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${process.env.PORT || '3000'}`);
}

app.whenReady().then(async () => {
  try {
    await startBackendServer();
  } catch (error) {
    dialog.showErrorBox(
      'AI Health Navigator',
      `Failed to start backend server: ${error?.message || error}`
    );
    app.quit();
    return;
  }

  const ready = await waitForServer(`http://localhost:${process.env.PORT || '3000'}`);
  if (!ready) {
    dialog.showErrorBox(
      'AI Health Navigator',
      'Backend server did not start. Please check environment variables and try again.'
    );
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Backend runs in-process and exits with the app.
});
