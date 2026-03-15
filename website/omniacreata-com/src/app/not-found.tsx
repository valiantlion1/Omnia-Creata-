import type { Route } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { defaultLocale } from "@/i18n/config";

export default function NotFound() {
  return (
    <section className="px-6 pb-24 pt-20 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="luxury-panel gold-outline relative overflow-hidden rounded-[32px] px-8 py-14 sm:px-12 sm:py-16">
          <div className="hero-haze ambient-pulse -left-16 top-10 h-48 w-48 bg-[rgba(217,181,109,0.22)]" />
          <div className="relative space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-accent">
              Page not found
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-6xl">
              The page you requested is not part of the public Omnia Creata site.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
              Return to the official ecosystem overview or move directly into the flagship Studio experience.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/${defaultLocale}`} variant="primary">
                Back to home
              </ButtonLink>
              <ButtonLink
                href={`/${defaultLocale}/products/omnia-creata-studio`}
                variant="secondary"
              >
                Open Studio page
              </ButtonLink>
            </div>
            <p className="text-sm text-muted">
              Looking for a specific page? Browse the{" "}
              <Link
                className="text-accent transition hover:text-accent-strong"
                href={`/${defaultLocale}/products` as Route}
              >
                Products overview
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
