import { BrandMark } from "@/components/shared/brand-mark";
import { Surface } from "@/components/ui/primitives";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Surface className="intro-fade-rise w-full max-w-[480px] rounded-[32px] bg-[var(--surface)] p-8 text-center">
        <div className="space-y-5">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <div className="flex justify-center">
            <div className="intro-pulse-ring relative h-20 w-20 rounded-full border border-[var(--accent-soft)]">
              <div className="intro-pulse-dot absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-strong)]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)]">
              Preparing your workspace
            </div>
            <div className="text-sm leading-7 text-[var(--text-secondary)]">
              Loading the lighter, calmer writing surface for your next entry.
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}
