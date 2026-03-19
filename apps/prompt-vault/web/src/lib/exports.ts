import type { PromptVaultDataset } from "@prompt-vault/types";
import { getEntries } from "@/lib/dataset";

function linesForPrompt(prompt: PromptVaultDataset["prompts"][number]) {
  return [
    `# ${prompt.title}`,
    "",
    prompt.summary ? `Summary: ${prompt.summary}` : "",
    `Type: ${prompt.type}`,
    `Platforms: ${prompt.platforms.join(", ") || "Generic"}`,
    "",
    prompt.body,
    "",
    prompt.notes ? `Notes:\n${prompt.notes}` : "",
    prompt.resultNotes ? `Result Notes:\n${prompt.resultNotes}` : "",
    "---",
    ""
  ].filter(Boolean);
}

export function exportAsJson(dataset: PromptVaultDataset) {
  return JSON.stringify(dataset, null, 2);
}

export function exportAsMarkdown(dataset: PromptVaultDataset) {
  return getEntries(dataset).flatMap(linesForPrompt).join("\n");
}

export function exportAsText(dataset: PromptVaultDataset) {
  return getEntries(dataset)
    .map((prompt) =>
      [
        prompt.title,
        prompt.body,
        prompt.notes ? `Notes: ${prompt.notes}` : "",
        prompt.resultNotes ? `Result Notes: ${prompt.resultNotes}` : "",
        ""
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n====================\n");
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
