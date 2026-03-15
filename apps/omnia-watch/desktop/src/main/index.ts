import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { AgentController } from "@main/services/agent-controller";
import { registerIpcHandlers } from "@main/ipc";

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    backgroundColor: "#080c18",
    height: 960,
    minHeight: 760,
    minWidth: 1200,
    title: "Omnia Watch Companion",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js")
    },
    width: 1440
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers(new AgentController());
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
