import { useState, useEffect, useCallback } from 'preact/hooks'

// Supported deep link types
export const DEEP_LINK_TYPES = {
  LOTTERY: 'lottery',
  DAO: 'dao',
}

// Contract IDs for each deep link type
export const DEEP_LINK_CONTRACT_IDS = {
  [DEEP_LINK_TYPES.LOTTERY]: 'vsc1BiM4NC1yeGPCjmq8FC3utX8dByizjcCBk7',
  [DEEP_LINK_TYPES.DAO]: 'vsc1Ba9AyyUcMnYVoDVsjoJztnPFHNxQwWBPsb',
}

/**
 * Parse a deep link from the URL hash
 * Supports formats like: #lottery/123, #dao/456
 * @returns {{ type: string, id: string } | null}
 */
export function parseDeepLink(hash) {
  if (!hash || typeof hash !== 'string') return null

  // Remove leading #
  const cleanHash = hash.replace(/^#/, '')

  // Try to match deep link pattern: type/id
  const match = cleanHash.match(/^(lottery|dao)\/(.+)$/)
  if (!match) return null

  const [, type, id] = match
  return { type, id }
}

/**
 * Generate a deep link URL for a given type and ID
 * @param {string} type - The deep link type (lottery, dao)
 * @param {string|number} id - The entity ID
 * @returns {string} The full URL with deep link hash
 */
export function generateDeepLinkUrl(type, id) {
  if (!type || id === undefined || id === null) return ''

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : ''

  return `${baseUrl}#${type}/${id}`
}

/**
 * Copy a deep link URL to clipboard
 * @param {string} type - The deep link type
 * @param {string|number} id - The entity ID
 * @returns {Promise<boolean>} Whether the copy was successful
 */
export async function copyDeepLinkToClipboard(type, id) {
  const url = generateDeepLinkUrl(type, id)
  if (!url) return false

  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Update the browser URL to show the deep link (without triggering navigation)
 * @param {string} type - The deep link type
 * @param {string|number} id - The entity ID
 */
export function updateUrlToDeepLink(type, id) {
  if (typeof window === 'undefined') return
  if (!type || id === undefined || id === null) return

  const newHash = `#${type}/${id}`
  // Use replaceState to avoid adding to browser history
  window.history.replaceState({ page: 1, deepLink: { type, id } }, '', newHash)
}

/**
 * Reset the browser URL back to the standard page hash
 * @param {number} pageIndex - The page index to set
 */
export function resetUrlFromDeepLink(pageIndex = 1) {
  if (typeof window === 'undefined') return
  window.history.replaceState({ page: pageIndex }, '', `#p${pageIndex}`)
}

/**
 * Hook to manage deep link state
 * @returns {{ deepLink: object|null, clearDeepLink: function, setDeepLinkHandled: function }}
 */
export function useDeepLink() {
  const [deepLink, setDeepLink] = useState(() => {
    if (typeof window === 'undefined') return null
    return parseDeepLink(window.location.hash)
  })
  const [handled, setHandled] = useState(false)

  // Listen for hash changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleHashChange = () => {
      const parsed = parseDeepLink(window.location.hash)
      if (parsed) {
        setDeepLink(parsed)
        setHandled(false)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Clear deep link and update URL to standard page hash
  const clearDeepLink = useCallback((pageIndex = 1) => {
    setDeepLink(null)
    setHandled(true)
    if (typeof window !== 'undefined') {
      window.history.replaceState({ page: pageIndex }, '', `#p${pageIndex}`)
    }
  }, [])

  // Mark the deep link as handled (but don't clear from state yet)
  const setDeepLinkHandled = useCallback(() => {
    setHandled(true)
  }, [])

  return {
    deepLink: handled ? null : deepLink,
    rawDeepLink: deepLink,
    clearDeepLink,
    setDeepLinkHandled,
    isDeepLinkHandled: handled,
  }
}
