import {
  deviceSyncPayloadSchema,
  deviceSyncResponseSchema,
  pairingCompleteRequestSchema,
  pairingCompleteResponseSchema,
  pairingStartRequestSchema,
  pairingStartResponseSchema
} from "@omnia-watch/validation";

export const apiContracts = {
  devicePairingComplete: {
    method: "POST",
    path: "/api/device/pair/complete",
    request: pairingCompleteRequestSchema,
    response: pairingCompleteResponseSchema
  },
  devicePairingStart: {
    method: "POST",
    path: "/api/device/pair/start",
    request: pairingStartRequestSchema,
    response: pairingStartResponseSchema
  },
  deviceSync: {
    method: "POST",
    path: "/api/device/sync",
    request: deviceSyncPayloadSchema,
    response: deviceSyncResponseSchema
  },
  health: {
    method: "GET",
    path: "/api/health"
  }
} as const;
