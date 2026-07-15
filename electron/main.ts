import type { Event as ElectronEvent, IpcMainEvent, IpcMainInvokeEvent } from 'electron';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');

// Keep the internal storage identity stable so a display-name change never hides existing diaries.
app.setName('CalendarDiary');

// 数据存储路径
const USER_DATA_PATH = app.getPath('userData');
const DATA_FILE = path.join(USER_DATA_PATH, 'calendar_data.json');
const PLANS_FILE = path.join(USER_DATA_PATH, 'calendar_plans.json');

let mainWindow: typeof BrowserWindow | null = null;
let storageWriteQueue: Promise<void> = Promise.resolve();

// 确保数据文件存在
async function ensureDataFiles() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '{}');
  }
  
  try {
    await fs.access(PLANS_FILE);
  } catch {
    await fs.writeFile(PLANS_FILE, '{}');
  }
}

async function readJsonFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return {};
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Storage payload must be an object');
  }

  const tempFile = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await fs.writeFile(tempFile, JSON.stringify(value, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
    await fs.rename(tempFile, filePath);
  } finally {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
  }
}

function queueJsonWrite(filePath: string, value: unknown) {
  const pendingWrite = storageWriteQueue.then(() => writeJsonFile(filePath, value));
  storageWriteQueue = pendingWrite.catch(() => undefined);
  return pendingWrite;
}

function isSafeExternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function assertTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent) {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Rejected IPC request from an untrusted sender');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: '日历日记',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on('will-navigate', (event: ElectronEvent, url: string) => {
    const expectedUrl: string = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173/'
      : pathToFileURL(path.join(__dirname, '../dist/index.html')).href;

    if (url !== expectedUrl && !url.startsWith(`${expectedUrl}#`)) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // 开发环境加载 Vite 服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow?.loadURL('http://localhost:5173');
    // mainWindow?.webContents.openDevTools(); // 调试模式已关闭
  } else {
    // 生产环境加载打包后的文件
    mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow?.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureDataFiles();
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

// IPC handlers for data persistence
ipcMain.handle('storage:getData', async (event: IpcMainInvokeEvent) => {
  assertTrustedSender(event);
  return readJsonFile(DATA_FILE);
});

ipcMain.handle('storage:setData', async (event: IpcMainInvokeEvent, data: unknown) => {
  assertTrustedSender(event);
  try {
    await queueJsonWrite(DATA_FILE, data);
    return { success: true };
  } catch (error) {
    console.error('Error writing data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('storage:getPlans', async (event: IpcMainInvokeEvent) => {
  assertTrustedSender(event);
  return readJsonFile(PLANS_FILE);
});

ipcMain.handle('storage:setPlans', async (event: IpcMainInvokeEvent, plans: unknown) => {
  assertTrustedSender(event);
  try {
    await queueJsonWrite(PLANS_FILE, plans);
    return { success: true };
  } catch (error) {
    console.error('Error writing plans:', error);
    return { success: false, error: String(error) };
  }
});

// Window controls
ipcMain.on('window:minimize', (event: IpcMainEvent) => {
  assertTrustedSender(event);
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', (event: IpcMainEvent) => {
  assertTrustedSender(event);
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', (event: IpcMainEvent) => {
  assertTrustedSender(event);
  mainWindow?.close();
});

// Get data file path
ipcMain.handle('storage:getDataPath', async (event: IpcMainInvokeEvent) => {
  assertTrustedSender(event);
  return USER_DATA_PATH;
});

// Open data folder
ipcMain.handle('storage:openDataFolder', async (event: IpcMainInvokeEvent) => {
  assertTrustedSender(event);
  try {
    const errorMessage = await shell.openPath(USER_DATA_PATH);
    if (errorMessage) throw new Error(errorMessage);
    return { success: true };
  } catch (error) {
    console.error('Error opening folder:', error);
    return { success: false, error: String(error) };
  }
});

// Open external URL in default browser
ipcMain.handle('shell:openExternal', async (event: IpcMainInvokeEvent, url: string) => {
  assertTrustedSender(event);
  if (!isSafeExternalUrl(url)) {
    throw new Error('Only HTTP(S) URLs may be opened externally');
  }
  try {
    await shell.openExternal(url);
  } catch (error) {
    console.error('Error opening external URL:', error);
    throw error;
  }
});

// App version
ipcMain.handle('app:getVersion', (event: IpcMainInvokeEvent) => {
  assertTrustedSender(event);
  return app.getVersion();
});
