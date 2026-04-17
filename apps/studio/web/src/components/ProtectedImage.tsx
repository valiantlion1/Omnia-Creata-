import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { useStudioAuth } from '@/lib/studioAuth'

/**
 * Returns true if the current user should see watermarks on generated images.
 * Free users and guests always get watermarks; pro users do not.
 */
export function useWatermarkRequired(): boolean {
  const { auth, isAuthenticated, isLoading } = useStudioAuth()
  if (isLoading) return false
  if (!isAuthenticated || auth?.guest) return true
  return auth?.identity.plan === 'free'
}

type ProtectedImageProps = {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  /** Show OmniaCreata logo watermark in bottom-right */
  watermark?: boolean
  /** Click handler (e.g. open lightbox). The image itself is pointer-events: none. */
  onClick?: () => void
  children?: ReactNode
}

/**
 * Image wrapper that:
 * - Disables right-click context menu
 * - Disables native drag-and-drop
 * - Optionally overlays the OmniaCreata watermark badge
 */
export function ProtectedImage({
  src,
  alt = '',
  className,
  style,
  watermark = false,
  onClick,
  children,
}: ProtectedImageProps) {
  const prevent = (e: MouseEvent) => e.preventDefault()

  return (
    <div
      className={`relative select-none${onClick ? ' cursor-zoom-in' : ''}`}
      onContextMenu={prevent}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={className}
        style={{ ...style, pointerEvents: 'none', WebkitUserDrag: 'none' } as CSSProperties}
      />
      {children}
      {watermark && <WatermarkBadge />}
    </div>
  )
}

/** Standalone watermark badge — can be used as an overlay inside any relative container */
export function WatermarkBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <img
      src="/omnia-logo.png"
      alt="Omnia Creata"
      draggable={false}
      className={`pointer-events-none absolute bottom-3 right-3 select-none ${
        size === 'md' ? 'h-7 w-7' : 'h-5 w-5'
      }`}
      style={{
        pointerEvents: 'none',
        opacity: 0.9,
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(220,180,50,0.25))',
      } as CSSProperties}
    />
  )
}
