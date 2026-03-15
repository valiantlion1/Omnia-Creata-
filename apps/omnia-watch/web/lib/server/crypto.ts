import { createHmac, randomBytes } from "node:crypto";

function getCredentialSecret() {
  const secret = process.env.DEVICE_CREDENTIAL_SECRET;
  if (!secret) {
    throw new Error(
      "DEVICE_CREDENTIAL_SECRET is required for live Omnia Watch device credential flows."
    );
  }

  return secret;
}

export function createPairingCode() {
  return `OW-${randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`;
}

export function createDeviceToken() {
  return randomBytes(32).toString("hex");
}

export function hashDeviceCredential(value: string) {
  return createHmac("sha256", getCredentialSecret()).update(value).digest("hex");
}
