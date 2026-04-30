/**
 * Verification Badge — Twitter/Instagram-style account verification ticks.
 *
 * Tier mapping:
 *   Free    → subtle gray ring
 *   Premium   → blue filled checkmark
 *   Essential → purple gradient checkmark
 *   Owner   → gold diamond with glow (only for owner_mode accounts)
 */

type BadgeTier = 'free' | 'pro' | 'creator' | 'owner'

type VerificationBadgeProps = {
  plan?: string
  ownerMode?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function resolveTier(plan?: string, ownerMode?: boolean): BadgeTier {
  if (ownerMode) return 'owner'
  if (plan === 'pro') return 'pro'
  if (plan === 'creator') return 'creator'
  return 'free'
}

const sizeMap = {
  sm: { box: 14, icon: 8, stroke: 1.5 },
  md: { box: 18, icon: 10, stroke: 1.8 },
  lg: { box: 22, icon: 12, stroke: 2 },
}

export function VerificationBadge({ plan, ownerMode, size = 'sm', className = '' }: VerificationBadgeProps) {
  const tier = resolveTier(plan, ownerMode)
  const s = sizeMap[size]

  if (tier === 'free') {
    // subtle gray ring — barely visible
    return (
      <svg
        width={s.box}
        height={s.box}
        viewBox="0 0 20 20"
        fill="none"
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth={s.stroke} className="text-zinc-600/40" />
      </svg>
    )
  }

  if (tier === 'owner') {
    // gold diamond with subtle glow animation
    return (
      <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} title="">
        <svg
          width={s.box}
          height={s.box}
          viewBox="0 0 20 20"
          fill="none"
          className="relative z-10"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ownerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5D060" />
              <stop offset="50%" stopColor="#FBE38E" />
              <stop offset="100%" stopColor="#D4A017" />
            </linearGradient>
          </defs>
          {/* diamond shape */}
          <path
            d="M10 1.5L18.5 10L10 18.5L1.5 10L10 1.5Z"
            fill="url(#ownerGrad)"
          />
          {/* inner star/sparkle */}
          <path
            d="M10 5.5L11.2 8.8L14.5 10L11.2 11.2L10 14.5L8.8 11.2L5.5 10L8.8 8.8L10 5.5Z"
            fill="#FFF8E1"
            fillOpacity="0.9"
          />
        </svg>
        {/* glow */}
        <span
          className="pointer-events-none absolute inset-0 animate-pulse rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,208,96,0.35) 0%, transparent 70%)',
            animationDuration: '3s',
          }}
        />
      </span>
    )
  }

  // Premium (blue) or Essential (purple gradient)
  const isPro = tier === 'pro'

  return (
    <svg
      width={s.box}
      height={s.box}
      viewBox="0 0 20 20"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      {!isPro && (
        <defs>
          <linearGradient id="creatorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      )}
      <circle cx="10" cy="10" r="9" fill={isPro ? '#3B82F6' : 'url(#creatorGrad)'} />
      <path
        d="M6.5 10.5L8.8 12.8L13.5 7.5"
        stroke="white"
        strokeWidth={s.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Inline badge for use next to display names.
 * Shows the badge inline with a small left margin.
 */
export function InlineBadge({ plan, ownerMode }: { plan?: string; ownerMode?: boolean }) {
  return <VerificationBadge plan={plan} ownerMode={ownerMode} size="sm" className="ml-1 -mt-px" />
}
