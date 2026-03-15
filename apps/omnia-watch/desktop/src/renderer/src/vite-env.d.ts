/// <reference types="vite/client" />

import type { OmniaWatchBridge } from "@shared/contracts";

declare global {
  interface Window {
    omniaWatch: OmniaWatchBridge;
  }
}
