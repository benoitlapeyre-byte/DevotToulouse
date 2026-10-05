const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let serverProcess;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // En développement, on se connecte au serveur Vite (port par défaut 8080 dans la config Lovable)
    // On suppose que "npm run dev" est lancé séparément
    mainWindow.loadURL("http://localhost:8080");
    mainWindow.webContents.openDevTools();
  } else {
    // En production, on lance le serveur Nitro packagé
    const net = require("net");
    const port = await new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const p = srv.address().port;
        srv.close(() => resolve(p));
      });
      srv.on("error", reject);
    });

    const serverPath = path.join(process.resourcesPath, "app.asar.unpacked", ".output", "server", "index.mjs");
    
    serverProcess = spawn(process.execPath, [serverPath], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: port.toString(), HOST: "127.0.0.1" },
      stdio: "pipe",
    });

    serverProcess.stdout.on("data", (data) => console.log(`Server: ${data}`));
    serverProcess.stderr.on("data", (data) => console.error(`Server Error: ${data}`));

    // On attend un peu que le serveur démarre, puis on charge l'URL
    setTimeout(() => {
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
    }, 1000);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
