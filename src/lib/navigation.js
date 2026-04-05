/**
 * Centralized navigation helpers.
 *
 * Embedded webviews (e.g. Hive Keychain) break when the app calls
 * history.pushState / replaceState, because react-native-webview
 * misinterprets those as real navigations and resets the page.
 *
 * Every piece of code that touches the History API should go through
 * these helpers so the check lives in one place.
 */

export const isEmbeddedWebView =
  typeof navigator !== 'undefined' &&
  /Keychain|WebView|wv\b/i.test(navigator.userAgent)

if (isEmbeddedWebView) {
  console.log('[Navigation] Embedded WebView detected — history API disabled')
}

/**
 * Safe wrapper around history.pushState.
 * No-ops inside embedded webviews.
 */
export function safePushState(state, title, url) {
  if (isEmbeddedWebView) return
  if (typeof window === 'undefined') return
  window.history.pushState(state, title, url)
}

/**
 * Safe wrapper around history.replaceState.
 * No-ops inside embedded webviews.
 */
export function safeReplaceState(state, title, url) {
  if (isEmbeddedWebView) return
  if (typeof window === 'undefined') return
  window.history.replaceState(state, title, url)
}
