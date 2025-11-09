import { useEffect, useState } from 'preact/hooks'

/**
 * Tracks whether the viewport width is below the provided breakpoint.
 * Keeps StepGame concerned with game logic while this hook encapsulates the resize plumbing.
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
