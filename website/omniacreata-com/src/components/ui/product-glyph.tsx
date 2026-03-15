import { cn } from "@/lib/utils";

type ProductGlyphProps = {
  slug: string;
  className?: string;
};

export function ProductGlyph({ slug, className }: ProductGlyphProps) {
  const shared = "h-5 w-5 stroke-[1.6]";

  switch (slug) {
    case "omnia-creata-studio":
      return (
        <svg
          className={cn(shared, className)}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <path d="M8 4.5V19.5" />
          <path d="M3.5 10H20.5" />
          <path d="M12.5 10V19.5" />
        </svg>
      );
    case "omniapixels":
      return (
        <svg
          className={cn(shared, className)}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 3.5L20.5 12L12 20.5L3.5 12L12 3.5Z" />
          <path d="M8.5 12H15.5" />
          <path d="M12 8.5V15.5" />
        </svg>
      );
    case "omniaorganizer":
      return (
        <svg
          className={cn(shared, className)}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 9.5H16" />
          <path d="M8 14H16" />
          <path d="M8 18.5H13" />
        </svg>
      );
    case "prompt-vault":
      return (
        <svg
          className={cn(shared, className)}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 10.5V8.5C6 5.73858 8.23858 3.5 11 3.5H13C15.7614 3.5 18 5.73858 18 8.5V10.5" />
          <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
          <path d="M12 14V17" />
        </svg>
      );
    default:
      return (
        <svg
          className={cn(shared, className)}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12L15 15" />
          <path d="M3.5 12H6" />
          <path d="M18 12H20.5" />
        </svg>
      );
  }
}
