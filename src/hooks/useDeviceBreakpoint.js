import { useEffect, useState } from 'preact/hooks'

/**
 * Keeps responsive logic isolated so screens can stay focused on their domain.
 * Returns true when the viewport is below the given breakpoint (defaults to 900px).
 */
export function useDeviceBreakpoint(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}
