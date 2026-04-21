import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";

type LegalSection = {
  title: string;
  content: string;
};

type LegalMetaItem = {
  label: string;
  value: string;
};

type LegalAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  summaryTitle: string;
  summary: string;
  meta: LegalMetaItem[];
  sections: LegalSection[];
  documentEyebrow: string;
  documentTitle: string;
  documentDescription: string;
  footerEyebrow: string;
  footerTitle: string;
  footerDescription: string;
  actions?: LegalAction[];
};

export function LegalDocumentPage({
  eyebrow,
  title,
  description,
  summaryTitle,
  summary,
  meta,
  sections,
  documentEyebrow,
  documentTitle,
  documentDescription,
  footerEyebrow,
  footerTitle,
  footerDescription,
  actions = [],
}: LegalDocumentPageProps) {
  return (
    <>
      <section className="relative px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div className="max-w-[44rem]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {eyebrow}
                </p>
                <h1 className="mt-5 text-[3.05rem] font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-[4rem] lg:text-[4.4rem]">
                  {title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
                  {description}
                </p>

                {!!actions.length && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    {actions.map((action) => (
                      <ButtonLink
                        key={`${action.href}-${action.label}`}
                        href={action.href}
                        size="lg"
                        variant={action.variant ?? "primary"}
                      >
                        {action.label}
                      </ButtonLink>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
                <div className="border-b border-white/[0.08] pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    {summaryTitle}
                  </p>
                  <p className="mt-3 text-base leading-8 text-foreground-soft">{summary}</p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {meta.map((item) => (
                    <article
                      key={item.label}
                      className="border-t border-white/[0.08] pt-4 sm:border-t-0 sm:pt-0"
                    >
                      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                        {item.label}
                      </p>
                      <p className="mt-3 text-base font-semibold text-foreground">{item.value}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.34fr_0.66fr] xl:items-start">
              <SectionHeader
                description={documentDescription}
                eyebrow={documentEyebrow}
                title={documentTitle}
              />

              <article className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.82),rgba(9,13,18,0.96))] p-6 shadow-[0_24px_72px_rgba(3,10,18,0.2)] sm:p-8">
                <div className="legal-copy">
                  {sections.map((section, index) => (
                    <section
                      key={section.title}
                      className="border-t border-white/[0.08] pt-6 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start gap-4">
                        <span className="mt-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h2 className="!mt-0">{section.title}</h2>
                          <p>{section.content}</p>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-12 pt-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-6 border-t border-white/[0.08] pt-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {footerEyebrow}
                </p>
                <h2 className="mt-4 text-[2.1rem] font-semibold tracking-[-0.05em] text-foreground sm:text-[2.5rem]">
                  {footerTitle}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                  {footerDescription}
                </p>
              </div>
              {!!actions.length && (
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  {actions.map((action) => (
                    <ButtonLink
                      key={`footer-${action.href}-${action.label}`}
                      href={action.href}
                      size="lg"
                      variant={action.variant ?? "primary"}
                    >
                      {action.label}
                    </ButtonLink>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
