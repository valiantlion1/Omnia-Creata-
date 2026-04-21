import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type PricingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const tiers = [
  {
    name: "Starter",
    description: "For teams opening their first Omnia Creata product.",
    useCase: "Best when you want a clean entry into Studio or a single supporting product.",
    features: ["Product setup", "Access guidance", "Email support"],
  },
  {
    name: "Growth",
    description: "For teams using multiple Omnia Creata products together.",
    useCase: "Best when Studio, Prompt Vault, OmniaPixels, or Watch need to work as one system.",
    features: ["Multi-product support", "Platform guidance", "Faster response"],
  },
  {
    name: "Enterprise",
    description: "For larger organizations with advanced support and planning needs.",
    useCase: "Best when rollout planning, procurement, security review, or long-term operating support matter.",
    features: ["Dedicated support", "Security guidance", "Strategic planning"],
  },
];

export async function generateMetadata({
  params,
}: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/pricing",
    title: "Pricing",
    description: "Pricing options for Omnia Creata products and support levels.",
  });
}

export default async function PricingPage({ params }: PricingPageProps) {
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
                  Pricing
                </p>
                <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-[4.9rem]">
                  Commercial paths should stay simple even when the product system grows.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground-soft">
                  Omnia Creata pricing is shaped around product mix, team size, and the kind of
                  support you need, not a noisy public matrix full of false precision.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink
                    href={withLocalePrefix(locale, "/contact")}
                    size="lg"
                    variant="primary"
                  >
                    Contact
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, "/products")}
                    size="lg"
                    variant="secondary"
                  >
                    View products
                  </ButtonLink>
                </div>

                <div className="mt-8 grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Model
                    </p>
                    <p className="text-base font-semibold text-foreground">Custom pricing</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Focus
                    </p>
                    <p className="text-base font-semibold text-foreground">Products and support</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Contact
                    </p>
                    <p className="text-base font-semibold text-foreground">hello@omniacreata.com</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
                <div className="border-b border-white/[0.08] pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    Pricing logic
                  </p>
                  <p className="mt-2 text-sm text-foreground-soft">
                    Commercial structure should mirror product reality instead of forcing every team
                    into the same public package.
                  </p>
                </div>

                <div className="mt-6 max-w-3xl">
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.3rem]">
                    Start with the product role, then match the support level.
                  </h2>
                  <p className="mt-4 text-base leading-8 text-foreground-soft">
                    The right commercial path depends on whether you are opening a single product,
                    connecting several Omnia surfaces, or planning a deeper long-term rollout with
                    support and review needs.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      01
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      One product
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Best when a single public route is enough to start work and validate fit.
                    </p>
                  </article>
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      02
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Several products
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Best when Studio needs to coordinate supporting surfaces as one working system.
                    </p>
                  </article>
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      03
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Deep support
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Best when rollout planning, procurement, security, or strategic guidance are required.
                    </p>
                  </article>
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
                description="These are not disposable pricing cards. They are simple commercial entry points that map to how the product family is actually used."
                eyebrow="Commercial paths"
                title="Three clear ways to start"
              />
              <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.62),rgba(9,13,18,0.92))]">
                {tiers.map((tier) => (
                  <article
                    key={tier.name}
                    className="grid gap-5 border-t border-white/[0.08] px-5 py-6 first:border-t-0 md:grid-cols-[0.8fr_1.2fr_auto] md:px-6"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Custom</p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                        {tier.name}
                      </h2>
                    </div>

                    <div className="max-w-2xl">
                      <p className="text-base leading-8 text-foreground-soft">{tier.description}</p>
                      <p className="mt-3 text-sm leading-7 text-foreground-soft">{tier.useCase}</p>
                      <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-muted">
                        {tier.features.join(" / ")}
                      </p>
                    </div>

                    <div className="md:justify-self-end">
                      <ButtonLink
                        className="w-full md:w-auto"
                        href={withLocalePrefix(locale, "/contact")}
                        size="md"
                        variant={tier.name === "Growth" ? "primary" : "secondary"}
                      >
                        Contact
                      </ButtonLink>
                    </div>
                  </article>
                ))}
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
                  If you already know the product, we can turn that into the right commercial path quickly.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
                  The fastest way forward is usually a short conversation about which Omnia Creata
                  surfaces you want to open and what kind of support you expect around them.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <ButtonLink
                  href={withLocalePrefix(locale, "/contact")}
                  size="lg"
                  variant="primary"
                >
                  Contact
                </ButtonLink>
                <ButtonLink
                  href={withLocalePrefix(locale, "/products")}
                  size="lg"
                  variant="secondary"
                >
                  View products
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
