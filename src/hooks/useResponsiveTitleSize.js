import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const TITLE_FONT_MIN = 5
export const TITLE_FONT_MAX = 16
const DEFAULT_CHAR_SCALE = 0.7

export function useResponsiveTitleSize({
  text,
  min = TITLE_FONT_MIN,
  max = TITLE_FONT_MAX,
  charScale = DEFAULT_CHAR_SCALE,
} = {}) {
  const wrapperRef = useRef(null)
  const [fontSize, setFontSize] = useState(max)
  const [isClamped, setIsClamped] = useState(false)

  const measure = useCallback(() => {
    const element = wrapperRef.current
    if (!element) {
      return
    }

    const width = element.clientWidth
    if (!width) {
      return
    }

    const charCount = Math.max(text?.replace(/\s+/g, '').length ?? 1, 1)
    const proposed = (width / charCount) * charScale
    const nextSize = clamp(proposed, min, max)
    setFontSize(nextSize)

    requestAnimationFrame(() => {
      const overflow = element.scrollWidth - element.clientWidth > 1
      setIsClamped(nextSize <= min && overflow)
    })
  }, [text, min, max, charScale])

  useEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) {
      return
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => measure())
      observer.observe(element)
      return () => observer.disconnect()
    }

    if (typeof window !== 'undefined') {
      const handler = () => measure()
      window.addEventListener('resize', handler)
      return () => window.removeEventListener('resize', handler)
    }

    return undefined
  }, [measure])

  return {
    wrapperRef,
    fontSize,
    isClamped,
  }
}
