"use client";

import { useState } from "react";
import type { Locale } from "@omnia-watch/types";
import { Button, Card, Input } from "@omnia-watch/ui";

interface PairingResponse {
  expiresAt: string;
  pairingCode: string;
  supportLink: string;
}

export function PairingPanel({
  locale,
  mode,
  title
}: {
  locale: Locale;
  mode: "connected" | "demo";
  title: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("My Windows PC");
  const [pairing, setPairing] = useState<PairingResponse | null>(null);
  const [pending, setPending] = useState(false);

  async function generatePairingCode() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/device/pair/start", {
        body: JSON.stringify({
          locale,
          nickname
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      const payload = (await response.json()) as PairingResponse & { error?: string };
      const responseMode = response.headers.get("x-omnia-watch-mode");
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate a pairing code.");
      }

      if (responseMode === "demo") {
        throw new Error(
          "The live device pipeline is not configured yet. Add the Supabase service-role key and device credential secret first."
        );
      }

      setPairing(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to generate a pairing code."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-accent/20 bg-accent/10">
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Generate a scoped pairing code in the authenticated SaaS, then enter it in the Windows
        companion to attach a real device identity to your account.
      </p>
      {mode === "connected" ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              name="nickname"
              onChange={(event) => setNickname(event.target.value)}
              placeholder="My Windows PC"
              value={nickname}
            />
            <Button disabled={pending || !nickname.trim()} onClick={generatePairingCode} type="button">
              {pending ? "Generating..." : "Generate pairing code"}
            </Button>
          </div>
          {error ? (
            <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {pairing ? (
            <div className="mt-4 rounded-2xl border border-line/70 bg-panel/40 p-4">
              <p className="text-sm uppercase tracking-[0.22em] text-muted">Pairing code</p>
              <p className="mt-2 font-display text-3xl font-semibold text-text">
                {pairing.pairingCode}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Expires {new Date(pairing.expiresAt).toLocaleString()}. If the Windows companion
                cannot complete pairing, check the support guidance at{" "}
                <a className="text-accent" href={pairing.supportLink}>
                  {pairing.supportLink}
                </a>
                .
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-line/70 bg-panel/40 px-4 py-3 text-sm text-muted">
          Live pairing becomes available after Supabase public keys, service-role access, and the
          device credential secret are configured.
        </div>
      )}
    </Card>
  );
}
