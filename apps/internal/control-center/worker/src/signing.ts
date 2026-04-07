export async function verifySignature(input: {
  timestamp: string;
  deliveryId: string;
  signature: string;
  body: string;
  secret: string;
}): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(input.secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const payload = `${input.timestamp}.${input.deliveryId}.${input.body}`;
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const digest = [...new Uint8Array(signatureBuffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  const normalized = input.signature.startsWith("sha256=")
    ? input.signature.slice(7)
    : input.signature;

  return digest === normalized;
}
