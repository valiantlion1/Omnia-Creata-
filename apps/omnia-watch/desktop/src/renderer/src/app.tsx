import { useEffect, useState } from "react";
import type { AgentScanResult, AgentStatus } from "@shared/contracts";

type SyncResult = {
  accepted: boolean;
  ingestedAt: string;
  recommendationCount: number;
};

export function App() {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [pairingCode, setPairingCode] = useState("");
  const [scan, setScan] = useState<AgentScanResult | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function refresh() {
    const [nextStatus, nextScan, nextLogs] = await Promise.all([
      window.omniaWatch.getStatus(),
      window.omniaWatch.getLastScan(),
      window.omniaWatch.getLogs()
    ]);
    setStatus(nextStatus);
    setScan(nextScan);
    setLogs(nextLogs);
  }

  useEffect(() => {
    refresh().catch((refreshError) => {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to load agent.");
    });
  }, []);

  async function runAction<T>(label: string, action: () => Promise<T>) {
    setBusyAction(label);
    setError(null);
    try {
      const result = await action();
      await refresh();
      return result;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="app-shell">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Omnia Creata</p>
          <h1>Omnia Watch Companion</h1>
          <p className="hero-copy">
            Pair this Windows device, run local scans, and send trustworthy maintenance telemetry
            back to the Omnia Watch SaaS workspace.
          </p>
        </div>
        <div className="hero-badges">
          <span className={`pill ${status?.paired ? "pill-positive" : "pill-warning"}`}>
            {status?.paired ? "Paired" : "Unpaired"}
          </span>
          <span className="pill">API: {status?.apiBaseUrl ?? "..."}</span>
        </div>
      </div>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {syncResult ? (
        <div className="banner banner-info">
          Last sync accepted at {new Date(syncResult.ingestedAt).toLocaleString()} with{" "}
          {syncResult.recommendationCount} recommendations.
        </div>
      ) : null}

      <div className="grid two-up">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Pairing</p>
              <h2>Device identity</h2>
            </div>
          </div>
          <div className="key-grid">
            <div className="metric-card">
              <span>Device name</span>
              <strong>{status?.deviceName ?? "Not paired yet"}</strong>
            </div>
            <div className="metric-card">
              <span>Machine ID</span>
              <strong>{status?.machineId ?? "Pending local read"}</strong>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="pairingCode">Pairing code</label>
            <input
              id="pairingCode"
              placeholder="OW-ABC123"
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
            />
          </div>
          <div className="actions">
            <button
              disabled={!pairingCode || busyAction !== null}
              onClick={() =>
                runAction("pair", async () => {
                  const nextStatus = await window.omniaWatch.pairWithCode(pairingCode.trim());
                  setStatus(nextStatus);
                  return nextStatus;
                })
              }
            >
              {busyAction === "pair" ? "Pairing..." : "Pair device"}
            </button>
            <button
              className="secondary"
              disabled={busyAction !== null}
              onClick={() => runAction("clear", () => window.omniaWatch.clearPairing())}
            >
              Clear pairing
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Scan and sync</h2>
            </div>
          </div>
          <div className="key-grid">
            <div className="metric-card">
              <span>Last scan</span>
              <strong>{status?.lastScanAt ? new Date(status.lastScanAt).toLocaleString() : "Never"}</strong>
            </div>
            <div className="metric-card">
              <span>Last sync</span>
              <strong>{status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}</strong>
            </div>
          </div>
          <div className="actions">
            <button
              disabled={busyAction !== null}
              onClick={() =>
                runAction("scan", async () => {
                  const nextScan = await window.omniaWatch.runScan();
                  setScan(nextScan);
                  return nextScan;
                })
              }
            >
              {busyAction === "scan" ? "Scanning..." : "Run local scan"}
            </button>
            <button
              className="secondary"
              disabled={busyAction !== null || !status?.paired}
              onClick={() =>
                runAction("sync", async () => {
                  const response = await window.omniaWatch.syncLastScan();
                  setSyncResult(response);
                  return response;
                })
              }
            >
              {busyAction === "sync" ? "Syncing..." : "Sync to SaaS"}
            </button>
          </div>
        </section>
      </div>

      <div className="grid two-up">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Latest scan</p>
              <h2>Local results</h2>
            </div>
          </div>
          {scan ? (
            <>
              <div className="key-grid">
                <div className="metric-card">
                  <span>Applications</span>
                  <strong>{scan.apps.length}</strong>
                </div>
                <div className="metric-card">
                  <span>Cleanup items</span>
                  <strong>{scan.cleanup.length}</strong>
                </div>
                <div className="metric-card">
                  <span>Startup entries</span>
                  <strong>{scan.startup.length}</strong>
                </div>
                <div className="metric-card">
                  <span>Recommendations</span>
                  <strong>{scan.recommendations.length}</strong>
                </div>
              </div>

              <div className="list-block">
                <h3>Applications needing attention</h3>
                {scan.apps
                  .filter((item) => item.status === "updatable" || item.status === "manual")
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="list-row">
                      <div>
                        <strong>{item.displayName}</strong>
                        <span>
                          {item.installedVersion}
                          {item.availableVersion ? ` -> ${item.availableVersion}` : ""}
                        </span>
                      </div>
                      <span className="pill">{item.status}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="empty">Run your first local scan to populate this workspace.</div>
          )}
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Agent logs</p>
              <h2>Operational trace</h2>
            </div>
          </div>
          <div className="log-list">
            {logs.length > 0 ? (
              logs.map((entry, index) => (
                <pre key={`${entry}-${index}`} className="log-entry">
                  {entry}
                </pre>
              ))
            ) : (
              <div className="empty">No logs yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
