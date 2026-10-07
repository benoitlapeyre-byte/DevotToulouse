const { app, BrowserWindow } = require("electron");
const path = require("path");
const net = require("net");
const http = require("http");
const fs = require("fs");
const { pathToFileURL } = require("url");

// 1. Verrou d'instance unique : empêche d'avoir de multiples instances en tâche de fond
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let serverStarted = false;
let serverPort = null;

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Chromium flags pour optimiser le démarrage et la réactivité
app.commandLine.appendSwitch("disable-http-cache", "false");

async function startServer() {
  if (serverStarted) return serverPort;

  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", ".output", "server", "index.mjs")
    : path.resolve(__dirname, "..", ".output", "server", "index.mjs");

  if (!fs.existsSync(serverPath)) {
    throw new Error(`Fichier serveur introuvable : ${serverPath}`);
  }

  // Interception de net.Server pour capturer le port réel et éviter les conflits (EADDRINUSE)
  let nitroPortResolved;
  let nitroPortRejected;
  const portPromise = new Promise((resolve, reject) => {
    nitroPortResolved = resolve;
    nitroPortRejected = reject;
  });

  const originalListen = net.Server.prototype.listen;
  net.Server.prototype.listen = function(...args) {
    this.once("listening", () => {
      const addr = this.address();
      if (addr && addr.port) {
        nitroPortResolved(addr.port);
        net.Server.prototype.listen = originalListen; // Restauration
      }
    });
    this.once("error", (err) => {
      nitroPortRejected(err);
      net.Server.prototype.listen = originalListen; // Restauration
    });
    return originalListen.apply(this, args);
  };

  // Demander au système d'allouer un port libre (port 0)
  process.env.PORT = "0";
  process.env.HOST = "127.0.0.1";
  process.env.NITRO_PORT = "0";
  process.env.NITRO_HOST = "127.0.0.1";

  const serverUrl = pathToFileURL(serverPath).href;

  try {
    await import(serverUrl);
  } catch (err) {
    net.Server.prototype.listen = originalListen;
    throw err;
  }

  // Attendre la confirmation du port de façon fiable (timeout 30s de sécurité)
  const port = await Promise.race([
    portPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout lors de l'écoute du serveur local.")), 30000))
  ]);

  serverStarted = true;
  serverPort = port;
  return port;
}

async function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", ".output", "public", "icon.png")
    : path.resolve(__dirname, "..", "public", "icon.png");

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 650,
    show: false, // Affichage propre uniquement quand peint pour éviter tout écran blanc/gel
    backgroundColor: "#F8FAFC",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false, // Gain de temps au boot de Chromium
    },
    autoHideMenuBar: true,
  });

  // Révélation fluide dès que l'UI est prête
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Sécurité pour forcer l'affichage si ready-to-show tarde
  const fallbackShowTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 3000);

  const isDev = !app.isPackaged && process.env.NODE_ENV !== "production" && !process.env.ELECTRON_START_PROD;

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:8080";
    try {
      await mainWindow.loadURL(devUrl);
    } catch {
      // Fallback vers le build Nitro si dev server n'est pas actif
      try {
        const port = await startServer();
        await mainWindow.loadURL(`http://127.0.0.1:${port}`);
      } catch (err) {
        console.error("Erreur de connexion :", err);
      }
    }
    mainWindow.webContents.openDevTools();
  } else {
    try {
      const port = await startServer();
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (err) {
      console.error("Erreur de démarrage du serveur :", err);
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <html style="background:#f8fafc;font-family:system-ui,sans-serif;padding:40px;color:#1e293b;">
          <body>
            <h2 style="color:#e11d48;margin-bottom:12px;">Erreur de démarrage du serveur local</h2>
            <p style="color:#64748b;margin-bottom:24px;">Une erreur s'est produite lors de l'initialisation de l'application :</p>
            <pre style="background:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;overflow:auto;">${err.stack || err.message}</pre>
          </body>
        </html>
      `)}`);
      mainWindow.show();
    }
  }

  mainWindow.on("closed", () => {
    clearTimeout(fallbackShowTimer);
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

// Fermeture propre et immédiate de l'application
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("SIGINT", () => {
  app.quit();
  process.exit(0);
});

process.on("SIGTERM", () => {
  app.quit();
  process.exit(0);
});

