import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioMotionScene } from "@/components/site/studio-motion-scene";
import { UseCaseStrip } from "@/components/site/use-case-strip";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import {
  studioAccessHref,
  studioAccessLabel,
  studioPrimaryHref,
  studioPrimaryLabel,
  withLocalePrefix,
} from "@/lib/utils";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const workflowPoints = [
  {
    title: "Shape the idea",
    description: "Start with prompts, references, and direction instead of a blank box.",
  },
  {
    title: "Generate with intent",
    description: "Move through variations without losing the visual thread of the project.",
  },
  {
    title: "Keep the selects",
    description: "Save the outputs and decisions worth building on.",
  },
];

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/",
    title: "Omnia Creata",
    description:
      "Omnia Creata builds creative software for image work, starting with Studio.",
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <section className="relative px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div className="space-y-7">
              <p className="site-kicker">Creative software</p>
              <h1 className="site-display max-w-[11ch]">
                Omnia Creata
                <br />
                for image work with taste.
              </h1>
              <p className="site-copy">
                Studio keeps prompts, references, runs, and selects in one visual workspace.
              </p>

              <div className="flex flex-wrap gap-3">
                <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
                  {studioPrimaryLabel()}
                </ButtonLink>
                <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="secondary">
                  Contact
                </ButtonLink>
              </div>
            </div>

            <StudioMotionScene />
          </div>

          <div className="mt-10">
            <UseCaseStrip
              items={[
                "Character and portrait work",
                "Concept art and key visuals",
                "Product and editorial imagery",
                "Moodboards and visual exploration",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="site-rule mx-auto grid max-w-[1180px] gap-10 pt-8 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="space-y-4">
            <p className="site-kicker">Studio</p>
            <h2 className="site-title max-w-[12ch]">Studio is where the work starts.</h2>
            <p className="site-copy">
              Shape direction. Generate. Keep the selects. Come back to the work with context.
            </p>
          </div>

          <div className="site-line-list">
            {workflowPoints.map((item) => (
              <article className="site-line-item" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-12 pt-2 sm:px-8 lg:px-10">
        <div className="site-rule mx-auto grid max-w-[1180px] gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <p className="site-kicker">Current access</p>
            <h2 className="site-title max-w-[10ch]">One product now. More when they are ready.</h2>
            <p className="site-copy">
              Studio is the live route. The rest can earn space later.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
              See Studio
            </ButtonLink>
            <ButtonLink href={studioAccessHref(locale)} size="lg" variant="primary">
              {studioAccessLabel()}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
