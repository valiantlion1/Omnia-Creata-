import { useEffect, useState } from 'react'

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true
    return !document.hidden
  })

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const syncVisibility = () => setIsVisible(!document.hidden)

    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [])

  return isVisible
}
