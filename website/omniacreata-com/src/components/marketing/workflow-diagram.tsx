import type { Route } from "next";
import Link from "next/link";
import type { LocaleCode } from "@/i18n/config";
import { withLocalePrefix } from "@/lib/utils";

type WorkflowDiagramProps = {
  locale: LocaleCode;
};

function getWorkflowSteps(locale: LocaleCode) {
  if (locale === "tr") {
    return [
      {
        id: "01",
        slug: "prompt-vault",
        name: "Prompt Vault",
        description:
          "Uretim oncesinde prompt sistemlerini ve tekrar kullanilabilir mantigi duzenler.",
      },
      {
        id: "02",
        slug: "omnia-creata-studio",
        name: "OmniaCreata Studio",
        description:
          "Yonetim, inceleme ve urun kararlarini tek merkezde toplar.",
      },
      {
        id: "03",
        slug: "omniapixels",
        name: "OmniaPixels",
        description:
          "Telefondaki fotograf duzenleme ve upscale akisini sade tutar.",
      },
      {
        id: "04",
        slug: "omniaorganizer",
        name: "OmniaOrganizer",
        description:
          "Plan, sorumluluk ve yayina cikis ritmini operasyonel hale getirir.",
      },
      {
        id: "05",
        slug: "omnia-watch",
        name: "Omnia Watch",
        description:
          "Kaliteyi ve sistem sinyallerini izleyerek donguyu tamamlar.",
      },
    ] as const;
  }

  return [
    {
      id: "01",
      slug: "prompt-vault",
      name: "Prompt Vault",
      description:
        "Organize prompts, systems, and reusable logic before work enters production.",
    },
    {
      id: "02",
      slug: "omnia-creata-studio",
      name: "OmniaCreata Studio",
      description:
        "Bring direction, review, and product decisions into one creative center.",
    },
    {
      id: "03",
      slug: "omniapixels",
      name: "OmniaPixels",
      description:
        "Edit, upscale, and export phone photos without turning the flow into a cloud dashboard.",
    },
    {
      id: "04",
      slug: "omniaorganizer",
      name: "OmniaOrganizer",
      description:
        "Turn active work into visible plans, ownership, launch rhythm, and execution.",
    },
    {
      id: "05",
      slug: "omnia-watch",
      name: "Omnia Watch",
      description:
        "Close the loop with monitoring, quality awareness, and ecosystem-level signals.",
    },
  ] as const;
}

export function WorkflowDiagram({ locale }: WorkflowDiagramProps) {
  const workflowSteps = getWorkflowSteps(locale);

  return (
    <div className="relative">
      <div className="absolute left-6 top-12 hidden h-px w-[calc(100%-3rem)] bg-[linear-gradient(90deg,rgba(217,181,109,0.24),rgba(255,255,255,0.08),rgba(217,181,109,0.24))] lg:block" />
      <div className="grid gap-5 lg:grid-cols-5">
        {workflowSteps.map((step) => (
          <Link
            key={step.id}
            className="luxury-panel relative rounded-[28px] p-5 transition duration-300 hover:-translate-y-1 hover:border-[rgba(217,181,109,0.24)]"
            href={withLocalePrefix(locale, `/products/${step.slug}`) as Route}
          >
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                {step.id}
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-foreground">
                {step.name}
              </h3>
              <p className="mt-4 text-sm leading-7 text-foreground-soft">
                {step.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
