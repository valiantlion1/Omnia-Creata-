"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

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

  return (
    <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Quick Actions</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Bounded operator controls</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={state.pending}
          onClick={() => run(`/api/incidents/${incidentId}/ack`)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-teal-300/35 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Acknowledge
        </button>
        <button
          type="button"
          disabled={state.pending}
          onClick={() => run(`/api/incidents/${incidentId}/silence`, { minutes: 30 })}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-teal-300/35 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mute 30m
        </button>
        <button
          type="button"
          disabled={state.pending}
          onClick={() =>
            run(`/api/incidents/${incidentId}/actions/recheck_public_health/run`, {
              environmentSlug
            })
          }
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-teal-300/35 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Recheck public health
        </button>
        <button
          type="button"
          disabled={state.pending}
          onClick={() =>
            run(`/api/incidents/${incidentId}/actions/trigger_staging_verify/run`, {
              environmentSlug
            })
          }
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-teal-300/35 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run verify
        </button>
        <button
          type="button"
          disabled={state.pending}
          onClick={() =>
            run(`/api/incidents/${incidentId}/actions/collect_incident_bundle/run`, {
              environmentSlug
            })
          }
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-teal-300/35 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Collect bundle
        </button>
        <button
          type="button"
          disabled={state.pending}
          onClick={() => run(`/api/incidents/${incidentId}/escalate-codex`)}
          className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-left text-sm text-amber-50 transition hover:border-amber-200/40 hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Escalate to Codex
        </button>
      </div>
      {state.message ? <p className="text-sm text-white/70">{state.message}</p> : null}
    </div>
  );
}
