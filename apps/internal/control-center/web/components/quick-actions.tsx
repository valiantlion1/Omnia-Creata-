"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ActionState = {
  pending: boolean;
  message: string | null;
};

async function postJson(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed with ${response.status}`);
  }

  return data;
}

type ActionButton = {
  label: string;
  detail: string;
  onClick: () => void;
  accent?: "default" | "warning";
};

export function QuickActions({
  incidentId,
  environmentSlug
}: {
  incidentId: string;
  environmentSlug: "staging" | "production";
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({
    pending: false,
    message: null
  });

  useEffect(() => {
    if (!state.message) {
      return;
    }
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, message: null }));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [state.message]);

  function run(url: string, body?: Record<string, unknown>) {
    startTransition(() => {
      setState({
        pending: true,
        message: null
      });

      postJson(url, body)
        .then((data) => {
          setState({
            pending: false,
            message: data?.message ?? "Action completed."
          });
          router.refresh();
        })
        .catch((error: Error) => {
          setState({
            pending: false,
            message: error.message
          });
        });
    });
  }

  const buttons: ActionButton[] = [
    {
      label: "Acknowledge",
      detail: "Mark the incident as seen and move the queue forward.",
      onClick: () => run(`/api/incidents/${incidentId}/ack`)
    },
    {
      label: "Mute 30m",
      detail: "Silence repeat noise while the operator investigates.",
      onClick: () => run(`/api/incidents/${incidentId}/silence`, { minutes: 30 })
    },
    {
      label: "Recheck public health",
      detail: "Run the bounded public-facing health check again.",
      onClick: () =>
        run(`/api/incidents/${incidentId}/actions/recheck_public_health/run`, {
          environmentSlug
        })
    },
    {
      label: "Run verify",
      detail: "Trigger the staging or environment verify workflow.",
      onClick: () =>
        run(`/api/incidents/${incidentId}/actions/trigger_staging_verify/run`, {
          environmentSlug
        })
    },
    {
      label: "Collect bundle",
      detail: "Attach a fresh incident bundle before handoff.",
      onClick: () =>
        run(`/api/incidents/${incidentId}/actions/collect_incident_bundle/run`, {
          environmentSlug
        })
    },
    {
      label: "Escalate to Codex",
      detail: "Create the bounded escalation package for deeper help.",
      onClick: () => run(`/api/incidents/${incidentId}/escalate-codex`),
      accent: "warning"
    }
  ];

  return (
    <div className="rounded-[28px] border border-[var(--ocos-border-strong)] bg-white/82 p-5 shadow-[0_18px_40px_rgba(73,58,44,0.08)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ocos-kicker">Quick Actions</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
            Bounded operator controls
          </h3>
        </div>
        <p className="text-sm text-[var(--ocos-muted)]">
          These controls are intentionally narrow so the room stays safe under pressure.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            disabled={state.pending}
            onClick={button.onClick}
            className={
              button.accent === "warning"
                ? "rounded-[22px] border border-amber-300/45 bg-amber-100/70 px-4 py-4 text-left transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                : "rounded-[22px] border border-[var(--ocos-border)] bg-[var(--ocos-surface-muted)] px-4 py-4 text-left transition hover:border-[var(--ocos-accent-soft)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            <div className="text-sm font-semibold text-[var(--ocos-ink)]">{button.label}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--ocos-muted)]">{button.detail}</div>
          </button>
        ))}
      </div>

      {state.message ? (
        <div className="mt-4 rounded-[20px] border border-[var(--ocos-border)] bg-[var(--ocos-surface-muted)] px-4 py-3 text-sm text-[var(--ocos-ink)]">
          {state.message}
        </div>
      ) : null}
    </div>
  );
}
