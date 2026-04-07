import { CodexList } from "@/components/codex-list";
import { NavShell } from "@/components/nav-shell";
import { listCodexEscalations } from "@/lib/ocos-store";

export default async function CodexPage() {
  const codexItems = await listCodexEscalations();

  return (
    <NavShell eyebrow="Expert Escalations">
      <CodexList items={codexItems} />
    </NavShell>
  );
}
