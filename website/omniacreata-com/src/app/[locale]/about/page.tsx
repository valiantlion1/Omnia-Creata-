import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const principles = [
  {
    title: "Focused product family",
    description:
      "Omnia Creata is built around a small set of flagship products with distinct jobs and clear routes.",
  },
  {
    title: "Calm public posture",
    description:
      "The main website should help people orient fast, not perform premium through noise or decorative excess.",
  },
  {
    title: "Design with discipline",
    description:
      "Structure, typography, and product truth matter more than card count or marketing theater.",
  },
];

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/about",
    title: "About",
    description:
      "About Omnia Creata, a focused software company built around connected flagship products.",
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <section className="relative px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div className="max-w-[44rem]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  About
                </p>
                <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-[4.9rem]">
                  Omnia Creata is a focused software company, not an ecosystem poster.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground-soft">
                  The public site should make that obvious through clear product roles, honest
                  access language, and a calmer product-first structure.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink
                    href={withLocalePrefix(locale, "/products")}
                    size="lg"
                    variant="primary"
                  >
                    View products
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, "/contact")}
                    size="lg"
                    variant="secondary"
                  >
                    Contact
                  </ButtonLink>
                </div>

                <div className="mt-8 grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Company posture
                    </p>
                    <p className="text-base font-semibold text-foreground">Premium software</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Primary domain
                    </p>
                    <p className="text-base font-semibold text-foreground">omniacreata.com</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Public role
                    </p>
                    <p className="text-base font-semibold text-foreground">Studio-first HQ</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
                <div className="border-b border-white/[0.08] pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    What the brand should communicate
                  </p>
                  <p className="mt-2 text-sm text-foreground-soft">
                    A serious software company with connected products, restrained taste, and a
                    clear flagship entry point.
                  </p>
                </div>

                <div className="mt-6 max-w-3xl">
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.3rem]">
                    The site should feel composed, direct, and ready to grow.
                  </h2>
                  <p className="mt-4 text-base leading-8 text-foreground-soft">
                    Omnia Creata is not trying to look like a giant company before the product
                    surfaces have earned that scale. The public layer should stay disciplined,
                    truthful, and easy to navigate.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {principles.map((item, index) => (
                    <article
                      key={item.title}
                      className="border-t border-white/[0.08] pt-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        0{index + 1}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-foreground-soft">
                        {item.description}
                      </p>
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
            <div className="grid gap-10 xl:grid-cols-[0.84fr_1.16fr]">
              <SectionHeader
                description="The company story should stay close to how the products actually work in public."
                eyebrow="Company posture"
                title="A restrained front door for a connected product family."
              />
              <div className="space-y-6">
                <p className="text-base leading-8 text-foreground-soft">
                  Studio holds the center of gravity because planning, review, and release are the
                  most coherent entry to the Omnia Creata system today. The rest of the products
                  support that flow with more specialized surfaces.
                </p>
                <p className="text-base leading-8 text-foreground-soft">
                  That means the website should not overstate maturity or hide behind polished card
                  walls. It should explain the company through product truth, access clarity, and a
                  strong visual hierarchy that still feels premium.
                </p>
              </div>
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
                  Next route
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.5rem]">
                  See the products first, then decide whether you need access, pricing, or a direct conversation.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                  The public brand becomes more credible when every route leads to a useful next
                  action instead of another ornamental section.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <ButtonLink
                  href={withLocalePrefix(locale, "/products")}
                  size="lg"
                  variant="primary"
                >
                  View products
                </ButtonLink>
                <ButtonLink
                  href={withLocalePrefix(locale, "/pricing")}
                  size="lg"
                  variant="secondary"
                >
                  View pricing
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
