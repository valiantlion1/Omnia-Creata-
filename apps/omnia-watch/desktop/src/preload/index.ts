import { contextBridge, ipcRenderer } from "electron";
import type { OmniaWatchBridge } from "@shared/contracts";

const api: OmniaWatchBridge = {
  clearPairing: () => ipcRenderer.invoke("agent:clear-pairing"),
  getLogs: () => ipcRenderer.invoke("agent:get-logs"),
  getLastScan: () => ipcRenderer.invoke("agent:get-last-scan"),
  getStatus: () => ipcRenderer.invoke("agent:get-status"),
  pairWithCode: (pairingCode) => ipcRenderer.invoke("agent:pair", pairingCode),
  runScan: () => ipcRenderer.invoke("agent:scan"),
  syncLastScan: () => ipcRenderer.invoke("agent:sync")
};

contextBridge.exposeInMainWorld("omniaWatch", api);
