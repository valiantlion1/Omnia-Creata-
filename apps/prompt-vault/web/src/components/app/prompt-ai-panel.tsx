"use client";

import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import type {
  AIAction,
  AIPromptInput,
  AISimilarPromptSuggestion,
  AISuggestionRecord,
  AIRewriteSuggestion
} from "@prompt-vault/types";
import { cn } from "@/lib/cn";
import { requestAIAssist } from "@/lib/ai/client";
import { getEntries } from "@/lib/dataset";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";
import { Badge, Button, Surface } from "@/components/ui/primitives";

type LocalSuggestion = AISuggestionRecord & { localOnly: true };

interface PromptAIHandlers {
  onApplyTitle?: (title: string) => void;
  onApplyCategory?: (categoryId: string) => void;
  onApplyTags?: (tags: string[]) => void;
  onApplyPlatforms?: (platforms: string[]) => void;
  onApplySummary?: (summary: string) => void;
  onApplyRewrite?: (payload: AIRewriteSuggestion) => void;
}

const ACTION_BUTTONS: Array<{
  action: AIAction;
  labelKey:
    | "app.aiSuggestTitle"
    | "app.aiSuggestCategory"
    | "app.aiSuggestTags"
    | "app.aiSuggestPlatforms"
    | "app.aiSummarize"
    | "app.aiImprovePrompt"
    | "app.aiMakeShorter"
    | "app.aiMakeDetailed"
    | "app.aiFindSimilar";
}> = [
  { action: "suggest_title", labelKey: "app.aiSuggestTitle" },
  { action: "suggest_category", labelKey: "app.aiSuggestCategory" },
  { action: "suggest_tags", labelKey: "app.aiSuggestTags" },
  { action: "suggest_platforms", labelKey: "app.aiSuggestPlatforms" },
  { action: "summarize", labelKey: "app.aiSummarize" },
  { action: "rewrite_cleaner", labelKey: "app.aiImprovePrompt" },
  { action: "make_shorter", labelKey: "app.aiMakeShorter" },
  { action: "make_detailed", labelKey: "app.aiMakeDetailed" },
  { action: "find_similar", labelKey: "app.aiFindSimilar" }
];

export function PromptAIPanel({
  prompt,
  promptId,
  handlers,
  collapsedByDefault = false
}: {
  prompt: AIPromptInput;
  promptId?: string;
  handlers?: PromptAIHandlers;
  collapsedByDefault?: boolean;
}) {
  const { dataset, recordAISuggestion, setAISuggestionStatus, runtime } = useVault();
  const { locale, t } = useLocaleContext();
  const { notify } = useToast();
  const [pendingAction, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<LocalSuggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [collapsed, setCollapsed] = useState(collapsedByDefault);

  const storedSuggestions = promptId
    ? dataset.aiSuggestions
        .filter((item) => item.promptId === promptId && item.status === "pending")
        .slice(0, 6)
    : [];
  const suggestions = promptId ? storedSuggestions : localSuggestions;

  const library = getEntries(dataset)
    .filter((item) => item.id !== promptId)
    .slice(0, 30)
    .map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      summary: item.summary,
      categoryId: item.categoryId,
      platforms: item.platforms,
      tagNames: item.tagIds
        .map((tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name)
        .filter(Boolean) as string[]
    }));

  function addLocalSuggestion(record: Omit<LocalSuggestion, "id" | "createdAt" | "updatedAt" | "status">) {
    const now = new Date().toISOString();
    setLocalSuggestions((current) => [
      {
        ...record,
        id: `local-ai-${crypto.randomUUID()}`,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        localOnly: true
      },
      ...current
    ]);
  }

  function rejectSuggestion(suggestion: AISuggestionRecord | LocalSuggestion) {
    if ("localOnly" in suggestion) {
      setLocalSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      return;
    }

    setAISuggestionStatus(suggestion.id, "rejected");
  }

  function applySuggestion(suggestion: AISuggestionRecord | LocalSuggestion) {
    switch (suggestion.action) {
      case "suggest_title":
        handlers?.onApplyTitle?.((suggestion.payload as { title: string }).title);
        break;
      case "suggest_category":
        handlers?.onApplyCategory?.((suggestion.payload as { categoryId: string }).categoryId);
        break;
      case "suggest_tags":
        handlers?.onApplyTags?.((suggestion.payload as { tags: string[] }).tags);
        break;
      case "suggest_platforms":
        handlers?.onApplyPlatforms?.((suggestion.payload as { platforms: string[] }).platforms);
        break;
      case "summarize":
        handlers?.onApplySummary?.((suggestion.payload as { summary: string }).summary);
        break;
      case "rewrite_cleaner":
      case "make_shorter":
      case "make_detailed":
        handlers?.onApplyRewrite?.(suggestion.payload as AIRewriteSuggestion);
        break;
      default:
        break;
    }

    if ("localOnly" in suggestion) {
      setLocalSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    } else {
      setAISuggestionStatus(suggestion.id, "applied");
    }

    notify(t("app.aiApplied"));
  }

  function runAction(action: AIAction) {
    setErrorMessage("");
    setActiveAction(action);

    startTransition(async () => {
      try {
        const { data, latencyMs } = await requestAIAssist({
          action,
          prompt,
          library
        });

        if (promptId) {
          recordAISuggestion(data, { promptId, latencyMs });
        } else {
          addLocalSuggestion({
            action: data.action,
            provider: data.provider,
            model: data.model,
            promptId,
            payload: data.payload,
            localOnly: true
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("app.aiRequestFailed");
        setErrorMessage(message);
      } finally {
        setActiveAction(null);
      }
    });
  }

  if (!runtime.enableAI) {
    return (
      <Surface className="space-y-5 p-5">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent-soft),var(--surface))] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[var(--shadow-glow)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {t("app.aiAssistantTitle")}
                  </div>
                  <div className="text-sm leading-6 text-[var(--text-secondary)]">
                    {t("app.aiBetaDisabledDescription")}
                  </div>
                </div>
              </div>
            </div>
            <Badge tone="accent">{t("app.aiComingSoonLabel")}</Badge>
          </div>
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="space-y-5 p-5">
      <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent-soft),var(--surface))] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[var(--shadow-glow)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("app.aiAssistantTitle")}
                </div>
                <div className="text-sm leading-6 text-[var(--text-secondary)]">
                  {t("app.aiAssistantDescription")}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="accent">{t("app.aiServerOnly")}</Badge>
            <Button onClick={() => setCollapsed((current) => !current)} size="sm" variant="ghost">
              <ChevronDown className={`h-4 w-4 transition ${collapsed ? "" : "rotate-180"}`} />
            </Button>
          </div>
        </div>
      </div>

      {!collapsed ? (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {ACTION_BUTTONS.map((item) => (
              <Button
                key={item.action}
                className="justify-start"
                disabled={pendingAction}
                onClick={() => runAction(item.action)}
                size="sm"
                variant={activeAction === item.action ? "primary" : "secondary"}
              >
                {activeAction === item.action && pendingAction ? t("app.aiWorking") : t(item.labelKey)}
              </Button>
            ))}
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-[color:rgba(182,93,82,0.35)] bg-[color:rgba(182,93,82,0.12)] px-4 py-3 text-sm text-[var(--danger)]">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-5 text-sm leading-7 text-[var(--text-secondary)]">
                {t("app.aiEmptyState")}
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {labelForAction(suggestion.action, t)}
                    </div>
                    <Badge>{t("app.aiLiveLabel")}</Badge>
                  </div>
                  <div className="mt-3">{renderSuggestionBody(suggestion, locale, t)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {suggestion.action !== "find_similar" ? (
                      <Button onClick={() => applySuggestion(suggestion)} size="sm">
                        {t("app.aiAccept")}
                      </Button>
                    ) : null}
                    <Button onClick={() => rejectSuggestion(suggestion)} size="sm" variant="ghost">
                      {suggestion.action === "find_similar" ? t("app.aiDismiss") : t("app.aiReject")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </Surface>
  );
}

function labelForAction(action: AIAction, t: (path: string) => string) {
  const labels: Record<AIAction, string> = {
    suggest_title: t("app.aiSuggestTitle"),
    suggest_category: t("app.aiSuggestCategory"),
    suggest_tags: t("app.aiSuggestTags"),
    suggest_platforms: t("app.aiSuggestPlatforms"),
    summarize: t("app.aiSummarize"),
    rewrite_cleaner: t("app.aiImprovePrompt"),
    make_shorter: t("app.aiMakeShorter"),
    make_detailed: t("app.aiMakeDetailed"),
    find_similar: t("app.aiFindSimilar")
  };

  return labels[action];
}

function renderSuggestionBody(
  suggestion: AISuggestionRecord | LocalSuggestion,
  locale: string,
  t: (path: string) => string
) {
  if (suggestion.action === "suggest_title") {
    const payload = suggestion.payload as { title: string; rationale?: string };
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold text-[var(--text-primary)]">{payload.title}</div>
        {payload.rationale ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{payload.rationale}</p>
        ) : null}
      </div>
    );
  }

  if (suggestion.action === "suggest_category") {
    const payload = suggestion.payload as { categoryId: string; reason?: string };
    return (
      <div className="space-y-2">
        <Badge tone="accent">{payload.categoryId}</Badge>
        {payload.reason ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{payload.reason}</p>
        ) : null}
      </div>
    );
  }

  if (suggestion.action === "suggest_tags") {
    const payload = suggestion.payload as { tags: string[]; reason?: string };
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {payload.tags.map((tag) => (
            <Badge key={tag}>#{tag}</Badge>
          ))}
        </div>
        {payload.reason ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{payload.reason}</p>
        ) : null}
      </div>
    );
  }

  if (suggestion.action === "suggest_platforms") {
    const payload = suggestion.payload as { platforms: string[]; reason?: string };
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {payload.platforms.map((platform) => (
            <Badge key={platform}>{platform}</Badge>
          ))}
        </div>
        {payload.reason ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{payload.reason}</p>
        ) : null}
      </div>
    );
  }

  if (suggestion.action === "summarize") {
    const payload = suggestion.payload as { summary: string };
    return <p className="text-sm leading-7 text-[var(--text-secondary)]">{payload.summary}</p>;
  }

  if (suggestion.action === "find_similar") {
    const payload = suggestion.payload as AISimilarPromptSuggestion;
    return (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <div className="font-semibold text-[var(--text-primary)]">{t("app.aiPossibleDuplicates")}</div>
          {payload.possibleDuplicates.length > 0 ? (
            payload.possibleDuplicates.map((match) => (
              <div
                key={match.promptId}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={localizeHref(locale as "en" | "tr", `/app/library/${match.promptId}`)}
                    className="font-medium text-[var(--text-primary)]"
                  >
                    {match.title}
                  </Link>
                  <Badge tone="warning">{Math.round(match.score * 100)}%</Badge>
                </div>
                <p className="mt-2 leading-6 text-[var(--text-secondary)]">{match.reason}</p>
              </div>
            ))
          ) : (
            <p className="leading-6 text-[var(--text-secondary)]">{t("app.aiNoStrongDuplicates")}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-[var(--text-primary)]">{t("app.aiRelatedPrompts")}</div>
          {payload.relatedPrompts.length > 0 ? (
            payload.relatedPrompts.map((match) => (
              <div
                key={match.promptId}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={localizeHref(locale as "en" | "tr", `/app/library/${match.promptId}`)}
                    className="font-medium text-[var(--text-primary)]"
                  >
                    {match.title}
                  </Link>
                  <Badge>{Math.round(match.score * 100)}%</Badge>
                </div>
                <p className="mt-2 leading-6 text-[var(--text-secondary)]">{match.reason}</p>
              </div>
            ))
          ) : (
            <p className="leading-6 text-[var(--text-secondary)]">{t("app.aiNoRelatedPrompts")}</p>
          )}
        </div>
      </div>
    );
  }

  const payload = suggestion.payload as AIRewriteSuggestion;
  return (
    <div className="space-y-3">
      {payload.summary ? (
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{payload.summary}</p>
      ) : null}
      <pre
        className={cn(
          "max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs leading-6 text-[var(--text-primary)]"
        )}
      >
        {payload.body}
      </pre>
      {payload.notes ? (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{payload.notes}</p>
      ) : null}
    </div>
  );
}
