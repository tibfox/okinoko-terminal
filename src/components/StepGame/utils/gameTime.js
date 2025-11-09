/**
 * Formats minutes-ago data from the API into a compact human readable string.
 */
export function formatMinutesAgo(minutes) {
  const totalMinutes = Number(minutes)
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return null
  }

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const mins = Math.floor(totalMinutes % 60)
  const hhmm = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}min`

  return days > 0 ? `${days}d ${hhmm}` : hhmm
}
