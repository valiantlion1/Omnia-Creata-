"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { StatusPill } from "@/components/status-pill";
import type {
  AutomationListItem,
  AutomationSafetyClass,
  AutomationStatus,
  AutomationTriggerType
} from "@/lib/ocos-automations";

function formatTimestamp(value?: string) {
  if (!value || value === "On demand" || value === "Manual" || value === "Paused") {
    return value ?? "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatPercent(value?: number) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return `${value.toFixed(1)}%`;
}

function toneFromAutomationStatus(status: AutomationStatus) {
  if (status === "active") {
    return "healthy" as const;
  }
  if (status === "degraded") {
    return "degraded" as const;
  }
  if (status === "failing") {
    return "failed" as const;
  }
  return "muted" as const;
}

function toneFromSafetyClass(safetyClass: AutomationSafetyClass) {
  if (safetyClass === "bounded_action") {
    return "open" as const;
  }
  if (safetyClass === "escalation_prep") {
    return "degraded" as const;
  }
  return "muted" as const;
}

function labelFromSafetyClass(safetyClass: AutomationSafetyClass) {
  if (safetyClass === "bounded_action") {
    return "bounded action";
  }
  if (safetyClass === "escalation_prep") {
    return "escalation prep";
  }
  return "observe";
}

function triggerTone(triggerType: AutomationTriggerType) {
  if (triggerType === "incident") {
    return "failed" as const;
  }
  if (triggerType === "event") {
    return "open" as const;
  }
  if (triggerType === "manual") {
    return "muted" as const;
  }
  return "healthy" as const;
}

function readParam(value: string | null, fallback: string) {
  return value && value.trim().length ? value : fallback;
}

export function AutomationsWorkbench({
  automations,
  title,
  description,
  lockedProjectSlug
}: {
  automations: AutomationListItem[];
  title: string;
  description: string;
  lockedProjectSlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => readParam(searchParams.get("q"), ""));
  const [projectFilter, setProjectFilter] = useState(() =>
    readParam(searchParams.get("project"), lockedProjectSlug ?? "all")
  );
  const [environmentFilter, setEnvironmentFilter] = useState(() => readParam(searchParams.get("env"), "all"));
  const [triggerFilter, setTriggerFilter] = useState(() => readParam(searchParams.get("trigger"), "all"));
  const [safetyFilter, setSafetyFilter] = useState(() => readParam(searchParams.get("safety"), "all"));
  const [statusFilter, setStatusFilter] = useState(() => readParam(searchParams.get("status"), "all"));
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(() => searchParams.get("automation"));
  const deferredSearch = useDeferredValue(search);

  const projectOptions = Array.from(
    new Set(automations.map((automation) => automation.projectSlug).filter((value): value is string => Boolean(value)))
  );
  const environmentOptions = Array.from(
    new Set(
      automations.map((automation) => automation.environmentSlug).filter((value): value is string => Boolean(value))
    )
  );

  const filteredAutomations = automations.filter((automation) => {
    const matchesSearch =
      deferredSearch.trim().length === 0 ||
      [automation.name, automation.summary, automation.owner, automation.lastIncidentTitle]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch.trim().toLowerCase());

    const activeProjectFilter = lockedProjectSlug ?? projectFilter;
    const matchesProject = activeProjectFilter === "all" ? true : automation.projectSlug === activeProjectFilter;
    const matchesEnvironment =
      environmentFilter === "all" ? true : automation.environmentSlug === environmentFilter;
    const matchesTrigger = triggerFilter === "all" ? true : automation.triggerType === triggerFilter;
    const matchesSafety = safetyFilter === "all" ? true : automation.safetyClass === safetyFilter;
    const matchesStatus = statusFilter === "all" ? true : automation.status === statusFilter;

    return matchesSearch && matchesProject && matchesEnvironment && matchesTrigger && matchesSafety && matchesStatus;
  });

  useEffect(() => {
    const nextSearch = readParam(searchParams.get("q"), "");
    const nextProject = readParam(searchParams.get("project"), lockedProjectSlug ?? "all");
    const nextEnvironment = readParam(searchParams.get("env"), "all");
    const nextTrigger = readParam(searchParams.get("trigger"), "all");
    const nextSafety = readParam(searchParams.get("safety"), "all");
    const nextStatus = readParam(searchParams.get("status"), "all");
    const nextAutomationId = searchParams.get("automation");

    if (search !== nextSearch) {
      setSearch(nextSearch);
    }
    if (projectFilter !== nextProject) {
      setProjectFilter(nextProject);
    }
    if (environmentFilter !== nextEnvironment) {
      setEnvironmentFilter(nextEnvironment);
    }
    if (triggerFilter !== nextTrigger) {
      setTriggerFilter(nextTrigger);
    }
    if (safetyFilter !== nextSafety) {
      setSafetyFilter(nextSafety);
    }
    if (statusFilter !== nextStatus) {
      setStatusFilter(nextStatus);
    }
    if (selectedAutomationId !== nextAutomationId) {
      setSelectedAutomationId(nextAutomationId);
    }
  }, [
    environmentFilter,
    lockedProjectSlug,
    projectFilter,
    safetyFilter,
    search,
    searchParams,
    selectedAutomationId,
    statusFilter,
    triggerFilter
  ]);

  useEffect(() => {
    if (!filteredAutomations.length) {
      if (selectedAutomationId !== null) {
        setSelectedAutomationId(null);
      }
      return;
    }

    const firstAutomation = filteredAutomations[0];
    if (!firstAutomation) {
      return;
    }

    if (!filteredAutomations.some((automation) => automation.id === selectedAutomationId)) {
      setSelectedAutomationId(firstAutomation.id);
    }
  }, [filteredAutomations, selectedAutomationId]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (search.trim()) {
      nextParams.set("q", search.trim());
    } else {
      nextParams.delete("q");
    }

    if (!lockedProjectSlug && projectFilter !== "all") {
      nextParams.set("project", projectFilter);
    } else {
      nextParams.delete("project");
    }

    if (environmentFilter !== "all") {
      nextParams.set("env", environmentFilter);
    } else {
      nextParams.delete("env");
    }

    if (triggerFilter !== "all") {
      nextParams.set("trigger", triggerFilter);
    } else {
      nextParams.delete("trigger");
    }

    if (safetyFilter !== "all") {
      nextParams.set("safety", safetyFilter);
    } else {
      nextParams.delete("safety");
    }

    if (statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    } else {
      nextParams.delete("status");
    }

    if (selectedAutomationId) {
      nextParams.set("automation", selectedAutomationId);
    } else {
      nextParams.delete("automation");
    }

    const currentQuery = searchParams.toString();
    const nextQuery = nextParams.toString();
    if (currentQuery === nextQuery) {
      return;
    }

    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  }, [
    environmentFilter,
    lockedProjectSlug,
    pathname,
    projectFilter,
    router,
    safetyFilter,
    search,
    searchParams,
    selectedAutomationId,
    statusFilter,
    triggerFilter
  ]);

  const selectedAutomation =
    filteredAutomations.find((automation) => automation.id === selectedAutomationId) ?? filteredAutomations[0] ?? null;
  const activeCount = filteredAutomations.filter((automation) => automation.status === "active").length;
  const failingCount = filteredAutomations.filter((automation) => automation.status === "failing").length;
  const boundedCount = filteredAutomations.filter((automation) => automation.safetyClass === "bounded_action").length;
  const manualCount = filteredAutomations.filter((automation) => automation.triggerType === "manual").length;

  return (
    <section className="space-y-4">
      <section className="ocos-panel-strong rounded-[16px] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="ocos-kicker">Playbooks And Recurring Jobs</p>
            <h2 className="mt-2 text-balance text-2xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ocos-muted)]">{description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/automations/builder"
              className="ocos-focus-ring inline-flex items-center rounded-full border border-[rgba(23,107,102,0.18)] bg-[rgba(23,107,102,0.08)] px-4 py-2 text-sm font-medium text-[var(--ocos-accent)] transition hover:border-[rgba(23,107,102,0.24)] hover:bg-[rgba(23,107,102,0.12)]"
            >
              New Playbook
            </Link>
            <Link
              href="/action-runs"
              className="ocos-focus-ring inline-flex items-center rounded-full border border-[var(--ocos-line)] bg-white/76 px-4 py-2 text-sm font-medium text-[var(--ocos-ink)] transition hover:border-[rgba(23,107,102,0.14)] hover:bg-[rgba(23,107,102,0.06)]"
            >
              View Action Runs
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-[16px] border border-[var(--ocos-line)] bg-[var(--ocos-line)] sm:grid-cols-2 xl:grid-cols-4">
        <article className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Active</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)] tabular-nums">
            {activeCount}
          </div>
        </article>
        <article className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Failing</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-danger)] tabular-nums">
            {failingCount}
          </div>
        </article>
        <article className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Bounded Actions</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-accent)] tabular-nums">
            {boundedCount}
          </div>
        </article>
        <article className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Manual Analyst Flows</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)] tabular-nums">
            {manualCount}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <section className="ocos-panel rounded-[16px] p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="ocos-kicker">Automation Index</p>
                <div aria-live="polite" className="mt-1 text-sm text-[var(--ocos-muted)]">
                  {filteredAutomations.length} playbooks visible
                </div>
              </div>

              <label className="block lg:max-w-[360px] lg:flex-1">
                <span className="sr-only">Search automations</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  name="automation_search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search playbooks, owners, or incidents…"
                  className="ocos-field w-full rounded-[12px] px-3 py-2.5 text-sm placeholder:text-[var(--ocos-soft)]"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {!lockedProjectSlug ? (
                <label className="grid gap-1">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--ocos-soft)]">Project</span>
                  <select
                    value={projectFilter}
                    onChange={(event) => setProjectFilter(event.target.value)}
                    name="project_filter"
                    className="ocos-field rounded-[12px] px-3 py-2.5 text-sm"
                  >
                    <option value="all">All projects</option>
                    {projectOptions.map((projectSlug) => (
                      <option key={projectSlug} value={projectSlug}>
                        {projectSlug}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--ocos-soft)]">Environment</span>
                <select
                  value={environmentFilter}
                  onChange={(event) => setEnvironmentFilter(event.target.value)}
                  name="environment_filter"
                  className="ocos-field rounded-[12px] px-3 py-2.5 text-sm"
                >
                  <option value="all">All environments</option>
                  {environmentOptions.map((environmentSlug) => (
                    <option key={environmentSlug} value={environmentSlug}>
                      {environmentSlug}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--ocos-soft)]">Trigger</span>
                <select
                  value={triggerFilter}
                  onChange={(event) => setTriggerFilter(event.target.value)}
                  name="trigger_filter"
                  className="ocos-field rounded-[12px] px-3 py-2.5 text-sm"
                >
                  <option value="all">All triggers</option>
                  <option value="schedule">Schedule</option>
                  <option value="event">Event</option>
                  <option value="incident">Incident</option>
                  <option value="manual">Manual</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--ocos-soft)]">Safety</span>
                <select
                  value={safetyFilter}
                  onChange={(event) => setSafetyFilter(event.target.value)}
                  name="safety_filter"
                  className="ocos-field rounded-[12px] px-3 py-2.5 text-sm"
                >
                  <option value="all">All safety classes</option>
                  <option value="observe">Observe</option>
                  <option value="bounded_action">Bounded action</option>
                  <option value="escalation_prep">Escalation prep</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--ocos-soft)]">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  name="status_filter"
                  className="ocos-field rounded-[12px] px-3 py-2.5 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="degraded">Degraded</option>
                  <option value="failing">Failing</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--ocos-line)]">
            <div className="hidden border-b border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)] lg:grid lg:grid-cols-[minmax(0,1.5fr)_140px_120px_120px_90px_110px_90px] lg:gap-3">
              <div>Name</div>
              <div>Trigger</div>
              <div>Scope</div>
              <div>Last Run</div>
              <div>Success</div>
              <div>Safety</div>
              <div>Status</div>
            </div>

            {filteredAutomations.length === 0 ? (
              <div className="ocos-empty-state px-4 py-6 text-sm">
                No playbooks match the current filters.
              </div>
            ) : (
              <div className="divide-y divide-[var(--ocos-line)]">
                {filteredAutomations.map((automation) => {
                  const selected = automation.id === selectedAutomation?.id;
                  const scopeLabel = [automation.projectSlug, automation.environmentSlug].filter(Boolean).join(" / ");

                  return (
                    <button
                      key={automation.id}
                      type="button"
                      onClick={() => setSelectedAutomationId(automation.id)}
                      aria-pressed={selected}
                      className={`ocos-row-button w-full px-3 py-3 text-left transition ${
                        selected
                          ? "bg-[rgba(23,107,102,0.06)]"
                          : "bg-[var(--ocos-surface)] hover:bg-[var(--ocos-surface-muted)]"
                      }`}
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_140px_120px_120px_90px_110px_90px] lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-[var(--ocos-ink)]">{automation.name}</div>
                            {automation.lastIncidentTitle ? (
                              <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)]">
                                linked incident
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 break-words text-sm leading-6 text-[var(--ocos-muted)]">
                            {automation.summary}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <StatusPill tone={triggerTone(automation.triggerType)}>{automation.triggerType}</StatusPill>
                          <div className="text-xs text-[var(--ocos-muted)]">{automation.triggerLabel}</div>
                        </div>
                        <div className="min-w-0 break-words text-sm text-[var(--ocos-ink)]">{scopeLabel || "Org-wide"}</div>
                        <div className="text-sm tabular-nums text-[var(--ocos-ink)]">{formatTimestamp(automation.lastRunAt)}</div>
                        <div className="text-sm tabular-nums text-[var(--ocos-ink)]">{formatPercent(automation.successRate30d)}</div>
                        <div>
                          <StatusPill tone={toneFromSafetyClass(automation.safetyClass)}>
                            {labelFromSafetyClass(automation.safetyClass)}
                          </StatusPill>
                        </div>
                        <div>
                          <StatusPill tone={toneFromAutomationStatus(automation.status)}>{automation.status}</StatusPill>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="ocos-panel-strong rounded-[16px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ocos-kicker">Selected Playbook</p>
                <h3 className="mt-2 text-balance text-lg font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
                  {selectedAutomation?.name ?? "No playbook selected"}
                </h3>
              </div>
              {selectedAutomation ? (
                <StatusPill tone={toneFromAutomationStatus(selectedAutomation.status)}>{selectedAutomation.status}</StatusPill>
              ) : null}
            </div>

            <p className="mt-3 text-sm leading-7 text-[var(--ocos-muted)]">
              {selectedAutomation?.summary ??
                "Pick a playbook from the table to inspect its trigger, safety class, and current operator path."}
            </p>

            {selectedAutomation ? (
              <div className="mt-4 grid gap-px overflow-hidden rounded-[14px] border border-[var(--ocos-line)] bg-[var(--ocos-line)] sm:grid-cols-2">
                <div className="bg-[var(--ocos-surface)] px-3 py-3">
                  <div className="ocos-kicker">Trigger</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">{selectedAutomation.triggerLabel}</div>
                </div>
                <div className="bg-[var(--ocos-surface)] px-3 py-3">
                  <div className="ocos-kicker">Owner</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">{selectedAutomation.owner}</div>
                </div>
                <div className="bg-[var(--ocos-surface)] px-3 py-3">
                  <div className="ocos-kicker">Next run</div>
                  <div className="mt-1 text-sm font-medium tabular-nums text-[var(--ocos-ink)]">
                    {formatTimestamp(selectedAutomation.nextRunAt)}
                  </div>
                </div>
                <div className="bg-[var(--ocos-surface)] px-3 py-3">
                  <div className="ocos-kicker">Last verified</div>
                  <div className="mt-1 text-sm font-medium tabular-nums text-[var(--ocos-ink)]">
                    {formatTimestamp(selectedAutomation.lastVerifiedAt)}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="ocos-panel rounded-[16px] p-4">
            <p className="ocos-kicker">Playbook Builder</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
              Build bounded flows without turning OCOS into a graph toy
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--ocos-muted)]">
              Builder flows should stay typed, safety-aware, and legible. They start from a trigger, pick a bounded
              action path, then prove the result through verification.
            </p>

            <div className="mt-4 rounded-[14px] border border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] p-4">
              <div className="grid gap-3">
                <div className="rounded-[12px] border border-[var(--ocos-line)] bg-[var(--ocos-surface)] px-3 py-2.5 text-sm font-medium text-[var(--ocos-ink)]">
                  Trigger
                </div>
                <div className="pl-2 text-sm text-[var(--ocos-muted)]">Scheduled probe, incident threshold, or operator launch</div>
                <div className="rounded-[12px] border border-[var(--ocos-line)] bg-[var(--ocos-surface)] px-3 py-2.5 text-sm font-medium text-[var(--ocos-ink)]">
                  Bounded path
                </div>
                <div className="pl-2 text-sm text-[var(--ocos-muted)]">Observe, bounded action, or escalation prep</div>
                <div className="rounded-[12px] border border-[var(--ocos-line)] bg-[var(--ocos-surface)] px-3 py-2.5 text-sm font-medium text-[var(--ocos-ink)]">
                  Verify
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/automations/builder"
                className="ocos-focus-ring inline-flex items-center rounded-full border border-[rgba(23,107,102,0.18)] bg-[rgba(23,107,102,0.08)] px-4 py-2 text-sm font-medium text-[var(--ocos-accent)] transition hover:border-[rgba(23,107,102,0.24)] hover:bg-[rgba(23,107,102,0.12)]"
              >
                Open builder brief
              </Link>
              <Link
                href="/action-runs"
                className="ocos-focus-ring inline-flex items-center rounded-full border border-[var(--ocos-line)] bg-white/76 px-4 py-2 text-sm font-medium text-[var(--ocos-ink)] transition hover:border-[rgba(23,107,102,0.14)] hover:bg-[rgba(23,107,102,0.06)]"
              >
                Review run history
              </Link>
            </div>
          </section>

          <section className="ocos-panel rounded-[16px] p-4">
            <p className="ocos-kicker">Safety Rule</p>
            <h3 className="mt-2 text-base font-semibold text-[var(--ocos-ink)]">Automation never outranks policy</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ocos-muted)]">
              <li>Observe flows may summarize, notify, and materialize reports.</li>
              <li>Bounded action flows may only trigger approved recipes with a verification step.</li>
              <li>Escalation prep flows gather evidence but do not mutate production truth alone.</li>
            </ul>
          </section>
        </aside>
      </section>
    </section>
  );
}
