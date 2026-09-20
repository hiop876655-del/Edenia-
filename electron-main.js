const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: "ايدينيا - حِسبة | نظام إدارة الحسابات والمبيعات",
    icon: path.join(__dirname, 'app_icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows local file loading seamlessly without CORS blocking
      allowRunningInsecureContent: true
    }
  });

  Menu.setApplicationMenu(null);

  // Load the offline application bundle directly
  const indexPath = path.join(__dirname, 'resources', 'app', 'index.html');
  const localAppPath = path.join(__dirname, 'app', 'index.html');

  if (require('fs').existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else if (require('fs').existsSync(localAppPath)) {
    mainWindow.loadFile(localAppPath);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
