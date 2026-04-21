import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioMotionScene } from "@/components/site/studio-motion-scene";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { studioPrimaryHref, studioPrimaryLabel, withLocalePrefix } from "@/lib/utils";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const principles = [
  {
    title: "Taste matters",
    description: "The tool should help the work look intentional, not generic.",
  },
  {
    title: "Workflow matters",
    description: "Direction, generation, review, and reuse belong to the same surface.",
  },
  {
    title: "Timing matters",
    description: "We would rather show one real product than five unfinished ones.",
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
      "Omnia Creata builds creative software for image work, starting with Studio.",
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="space-y-5">
            <p className="site-kicker">About</p>
            <h1 className="site-title max-w-[10ch]">We make creative software for image work.</h1>
            <p className="site-copy">
              Studio comes first. The rest can wait until it is real, useful, and ready to stand
              on its own.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
                See Studio
              </ButtonLink>
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                {studioPrimaryLabel()}
              </ButtonLink>
            </div>
          </div>

          <StudioMotionScene variant="compact" />
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">What matters</p>
            <h2 className="site-title max-w-[11ch]">Taste, workflow, and timing.</h2>
          </div>

          <div className="site-line-list">
            {principles.map((item) => (
              <article className="site-line-item" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
