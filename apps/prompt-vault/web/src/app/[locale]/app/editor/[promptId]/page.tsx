import { PromptEditor } from "@/components/app/prompt-editor";

export default async function AppEditPromptPage({
  params
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;
  return <PromptEditor promptId={promptId} />;
}
