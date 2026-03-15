"use client";

import { useState } from "react";
import { CollectionCard } from "@/components/app/collection-card";
import { PageHeader } from "@/components/app/page-header";
import { Badge, Button, EmptyState, Field, Input, SectionHeading, Surface } from "@/components/ui/primitives";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function CollectionsView() {
  const { dataset, createCollection } = useVault();
  const { t } = useLocaleContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    createCollection({
      name,
      description,
      color: "gold",
      icon: "folder"
    });
    setName("");
    setDescription("");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("app.collectionsTitle")} subtitle={t("app.collectionsSubtitle")} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <Surface className="space-y-4 p-5">
          <SectionHeading
            title={t("app.collectionsWorkspaceTitle")}
            description={t("app.collectionsWorkspaceDescription")}
          />
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={onCreate}>
            <Field label={t("app.collectionName")}>
              <Input onChange={(event) => setName(event.target.value)} value={name} />
            </Field>
            <Field label={t("app.collectionDescription")}>
              <Input onChange={(event) => setDescription(event.target.value)} value={description} />
            </Field>
            <div className="self-end">
              <Button type="submit">{t("app.createCollection")}</Button>
            </div>
          </form>
        </Surface>
        <Surface className="space-y-4 p-5">
          <SectionHeading title={t("app.collectionsTitle")} description={t("app.collectionsSubtitle")} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{dataset.collections.length} {t("common.collections")}</Badge>
            <Badge>{dataset.prompts.length} {t("app.itemsLabel")}</Badge>
          </div>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            {t("app.collectionsWorkspaceDescription")}
          </p>
        </Surface>
      </div>
      {dataset.collections.length === 0 ? (
        <EmptyState
          action={<Button>{t("app.createCollection")}</Button>}
          description={t("app.emptyStateDescription")}
          title={t("app.emptyStateTitle")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dataset.collections.map((collection) => (
            <CollectionCard key={collection.id} collectionId={collection.id} />
          ))}
        </div>
      )}
    </div>
  );
}
