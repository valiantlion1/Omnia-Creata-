import type { Route } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { defaultLocale } from "@/i18n/config";
import { studioUrl } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="px-6 pb-24 pt-20 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.88),rgba(9,13,18,0.97))] px-8 py-14 sm:px-12 sm:py-16">
          <div className="hero-haze ambient-pulse -left-16 top-10 h-48 w-48 bg-[rgba(188,209,229,0.16)]" />
          <div className="relative space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-accent">
              Page not found
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-6xl">
              The page you requested is not part of the public Omnia Creata site.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
              Return to the main site, browse the product map, or move directly into Studio.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/${defaultLocale}`} variant="primary">
                Back to home
              </ButtonLink>
              <ButtonLink href={studioUrl("/")} variant="secondary">
                Open Studio
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
