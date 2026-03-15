import { ipcMain } from "electron";
import { AgentController } from "@main/services/agent-controller";

export function registerIpcHandlers(controller: AgentController) {
  ipcMain.handle("agent:get-status", async () => controller.getStatus());
  ipcMain.handle("agent:get-logs", async () => controller.getLogs());
  ipcMain.handle("agent:get-last-scan", async () => controller.getLastScan());
  ipcMain.handle("agent:pair", async (_event, pairingCode: string) =>
    controller.pairWithCode(pairingCode)
  );
  ipcMain.handle("agent:clear-pairing", async () => controller.clearPairing());
  ipcMain.handle("agent:scan", async () => controller.runScan());
  ipcMain.handle("agent:sync", async () => controller.syncLastScan());
}
