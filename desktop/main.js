const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();

/* ---------- Penyimpanan data di komputer ----------
   Lokasi: %APPDATA%\Catatan Pelanggaran\data\
     pv_cache.json  = salinan data siswa, jenis, dan catatan dari server
     pv_queue.json  = catatan pelanggaran yang belum terkirim (antrean)
   Penulisan atomik + cadangan .bak supaya aman saat listrik padam. */
const KEYS = new Set(['pv_cache', 'pv_queue']);
const dataDir = () => path.join(app.getPath('userData'), 'data');
const fileOf = (k) => path.join(dataDir(), k + '.json');

function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
  fs.renameSync(tmp, file);
}
function readJson(k) {
  for (const f of [fileOf(k), fileOf(k) + '.bak']) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { /* coba cadangan */ }
  }
  return undefined;
}

ipcMain.handle('pv:load', () => {
  const out = {};
  for (const k of KEYS) { const v = readJson(k); if (v !== undefined) out[k] = v; }
  return out;
});
ipcMain.handle('pv:save', (_e, key, value) => {
  if (!KEYS.has(key)) return { ok: false, error: 'kunci tidak dikenal' };
  try { atomicWrite(fileOf(key), JSON.stringify(value)); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
});
ipcMain.handle('pv:openDataDir', () => { fs.mkdirSync(dataDir(), { recursive: true }); return shell.openPath(dataDir()); });

/* ---------- Jendela ---------- */
let win;
function createWindow() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Berkas', submenu: [
      { label: 'Buka folder data di komputer', click: () => shell.openPath(dataDir()) },
      { label: 'Muat ulang', accelerator: 'CmdOrCtrl+R', click: () => win && win.reload() },
      { type: 'separator' },
      { label: 'Keluar', role: 'quit' }
    ]}
  ]));
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 380, minHeight: 600,
    title: 'Catatan Pelanggaran', autoHideMenuBar: true,
    icon: fs.existsSync(path.join(__dirname, 'icon.ico')) ? path.join(__dirname, 'icon.ico') : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));   // dibuka dari komputer, tidak perlu internet
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}
app.whenReady().then(createWindow);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
