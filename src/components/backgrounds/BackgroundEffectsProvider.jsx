import { createContext } from 'preact'
import { useContext, useEffect, useMemo, useState } from 'preact/hooks'
import ColorBendsEffect from './ColorBendsEffect.jsx'
import LetterGlitchEffect from './LetterGlitchEffect.jsx'
import SilkEffect from './SilkEffect.jsx'
import ThreadsEffect from './ThreadsEffect.jsx'
import DarkVeilEffect from './DarkVeilEffect.jsx'
import FaultyTerminalEffect from './FaultyTerminalEffect.jsx'
import GlitterEffect from './GlitterEffect.jsx'
import TwinkleGridEffect from './TwinkleGridEffect.jsx'

export const BACKGROUND_EFFECTS = [
  {
    id: 'none',
    label: 'No Effect',
    description: 'Use the solid black backdrop.',
    component: null,
  },
  {
    id: 'color-bends',
    label: 'Color Balls',
    description: 'Flowing neon balls of color.',
    component: ColorBendsEffect,
  },
  {
    id: 'threads',
    label: 'Threads',
    description: 'Vertical light threads drifting across the screen.',
    component: ThreadsEffect,
  },
  // {
  //   id: 'dark-veil',
  //   label: 'Dark Shine',
  //   description: 'Slow, moody aurora-style shine.',
  //   component: DarkVeilEffect,
  // },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Just flickering scanlines.',
    component: FaultyTerminalEffect,
  },
  // {
  //   id: 'glitter',
  //   label: 'Stars',
  //   description: 'Sparkling stars drifting across the screen.',
  //   component: GlitterEffect,
  // },
  {
    id: 'twinkle-grid',
    label: 'Twinkle Grid',
    description: 'Grid of twinkling pixels inspired by button effects.',
    component: TwinkleGridEffect,
  },
]

const COOKIE_NAME = 'okinoko_terminal_background_effect'

const getDefaultEffectId = () =>
  BACKGROUND_EFFECTS.find((effect) => effect.id === 'color-bends')?.id ??
  BACKGROUND_EFFECTS[0]?.id ??
  null

const getValidEffectId = (candidate) =>
  BACKGROUND_EFFECTS.some((effect) => effect.id === candidate) ? candidate : null

const readEffectFromCookie = () => {
  if (typeof document === 'undefined') {
    return null
  }
  const value = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1]
  if (!value) {
    return null
  }
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

const writeEffectCookie = (effectId) => {
  if (typeof document === 'undefined') {
    return
  }
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(effectId)}; path=/; SameSite=Lax`
}

const BackgroundEffectsContext = createContext({
  effects: BACKGROUND_EFFECTS,
  activeEffectId: getDefaultEffectId(),
  setActiveEffectId: () => {},
})

export function BackgroundEffectsProvider({ children }) {
  const [activeEffectId, setActiveEffectId] = useState(() => getValidEffectId(readEffectFromCookie()) ?? getDefaultEffectId())
  const activeEffect = useMemo(
    () => BACKGROUND_EFFECTS.find((effect) => effect.id === activeEffectId) ?? null,
    [activeEffectId],
  )

  const EffectComponent = activeEffect?.component ?? null

  const contextValue = useMemo(
    () => ({
      effects: BACKGROUND_EFFECTS,
      activeEffectId,
      setActiveEffectId,
    }),
    [activeEffectId],
  )

  useEffect(() => {
    if (!activeEffectId) {
      return
    }
    writeEffectCookie(activeEffectId)
  }, [activeEffectId])

  return (
    <BackgroundEffectsContext.Provider value={contextValue}>
      {EffectComponent ? <EffectComponent /> : null}
      {children}
    </BackgroundEffectsContext.Provider>
  )
}

export const useBackgroundEffects = () => useContext(BackgroundEffectsContext)
