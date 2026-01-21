// Compare usernames case-insensitively
export const sameUser = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase()

// Cookie helpers for DAO group collapse state
export const getDaoGroupCollapseFromCookie = () => {
  if (typeof document === 'undefined') return { creator: false, member: false, public: false }
  const match = (document.cookie || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('daoGroupCollapse='))
  if (!match) return { creator: false, member: false, public: false }
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1] || '{}'))
  } catch {
    return { creator: false, member: false, public: false }
  }
}

// Cookie helper for DAO filter
export const getDaoFilterFromCookie = () => {
  if (typeof document === 'undefined') return 'all'
  const match = (document.cookie || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('daoRelationFilter='))
  if (!match) return 'all'
  const val = decodeURIComponent(match.split('=')[1] || '')
  return ALLOWED_DAO_FILTERS.includes(val) ? val : 'all'
}

// Constants
export const PIE_COLORS = ['#4fd1c5', '#ed64a6', '#63b3ed', '#f6ad55', '#9f7aea', '#68d391', '#f56565']
export const ALLOWED_DAO_FILTERS = ['all', 'created', 'member', 'viewer']

// Base button style generator
export const baseButtonStyle = (active = false) => ({
  backgroundColor: active ? 'var(--color-primary-darker)' : 'transparent',
  color: active ? 'black' : 'var(--color-primary-lighter)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: 'var(--font-size-base)',
  padding: '0.5em 1em',
  cursor: 'pointer',
  border: '1px solid var(--color-primary-darkest)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
})

// Parse semicolon-separated options
export const parseOptions = (str) =>
  (str || '')
    .split(';')
    .map((o) => o.trim())
    .filter(Boolean)

// Check if proposal is closed
export const isClosedProposal = (p) => {
  const state = (p.state || '').toLowerCase()
  return Boolean(p.result) || state === 'closed' || state === 'executed' || state === 'completed' || state === 'ready' || state === 'failed'
}

// Format number to 3 decimal places
export const formatNumber = (val) => {
  const num = Number(val)
  if (!Number.isFinite(num)) return null
  return num.toFixed(3)
}
