/**
 * Test Button Tracking Module
 *
 * Tracks:
 * 1. When a user successfully sends a multi-auth test transaction (configurable cooldown)
 * 2. When a user clicks the test button but does not complete the transaction
 *
 * Data is persisted server-side via the tracking API.
 */

// API base URL - configure via environment variable or default to localhost
const TRACKING_API_URL = import.meta.env.VITE_TRACKING_API_URL || 'http://localhost:3333'

// Cooldown period in hours - configure via environment variable or default to 24
const COOLDOWN_HOURS = parseFloat(import.meta.env.VITE_TEST_COOLDOWN_HOURS) || 24

/**
 * Check if a user can send a transaction (based on cooldown period)
 * @param {string} username - The Hive username
 * @returns {Promise<boolean>} True if the user can send, false if still in cooldown
 */
export const canUserSendToday = async (username) => {
  try {
    const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username
    const response = await fetch(
      `${TRACKING_API_URL}/api/tracking/can-send/${encodeURIComponent(normalizedUser)}?cooldown=${COOLDOWN_HOURS}`
    )

    if (!response.ok) {
      console.error('[TestButtonTracking] API error:', response.status)
      return true // Allow on API error to not block users
    }

    const data = await response.json()
    return data.canSend
  } catch (error) {
    console.error('[TestButtonTracking] Error checking if user can send:', error)
    return true // Allow on error to not block users
  }
}

/**
 * Get time until next allowed transaction for a user
 * @param {string} username - The Hive username
 * @returns {Promise<Object|null>} { hours, minutes } until reset, or null if can send now
 */
export const getTimeUntilReset = async (username) => {
  try {
    const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username
    const response = await fetch(
      `${TRACKING_API_URL}/api/tracking/can-send/${encodeURIComponent(normalizedUser)}?cooldown=${COOLDOWN_HOURS}`
    )

    if (!response.ok) {
      console.error('[TestButtonTracking] API error:', response.status)
      return null
    }

    const data = await response.json()
    return data.timeUntilReset
  } catch (error) {
    console.error('[TestButtonTracking] Error getting time until reset:', error)
    return null
  }
}

/**
 * Record that a user clicked the test button (started the flow)
 * This also starts the cooldown period
 * @param {string} username - The Hive username
 * @returns {Promise<{clickId: string|null, error: string|null, timeUntilReset: Object|null}>}
 */
export const recordTestButtonClick = async (username) => {
  try {
    const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username

    const response = await fetch(`${TRACKING_API_URL}/api/tracking/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: normalizedUser, cooldown: COOLDOWN_HOURS })
    })

    if (response.status === 429) {
      // User is in cooldown
      const errorData = await response.json()
      console.log(`[TestButtonTracking] User ${normalizedUser} is in cooldown`)
      return { clickId: null, error: 'cooldown', timeUntilReset: errorData.timeUntilReset }
    }

    if (!response.ok) {
      console.error('[TestButtonTracking] API error recording click:', response.status)
      return { clickId: null, error: 'api_error', timeUntilReset: null }
    }

    const data = await response.json()
    console.log(`[TestButtonTracking] Recorded click for user: ${normalizedUser}`)
    return { clickId: data.clickId, error: null, timeUntilReset: null }
  } catch (error) {
    console.error('[TestButtonTracking] Error recording click:', error)
    return { clickId: null, error: 'network_error', timeUntilReset: null }
  }
}

/**
 * Record that a user successfully sent a transaction
 * Also marks the associated click as completed
 * @param {string} username - The Hive username
 * @param {string} clickId - The click ID from recordTestButtonClick
 * @returns {Promise<boolean>} True if recorded successfully
 */
export const recordTransactionSent = async (username, clickId) => {
  try {
    const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username

    const response = await fetch(`${TRACKING_API_URL}/api/tracking/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: normalizedUser, clickId, cooldown: COOLDOWN_HOURS })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[TestButtonTracking] API error recording transaction:', response.status, errorData)
      return false
    }

    console.log(`[TestButtonTracking] Recorded transaction for user: ${normalizedUser}`)
    return true
  } catch (error) {
    console.error('[TestButtonTracking] Error recording transaction:', error)
    return false
  }
}

/**
 * Get statistics for a user
 * @param {string} username - The Hive username
 * @returns {Promise<Object>} User statistics
 */
export const getUserStats = async (username) => {
  try {
    const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username
    const response = await fetch(
      `${TRACKING_API_URL}/api/tracking/stats/${encodeURIComponent(normalizedUser)}?cooldown=${COOLDOWN_HOURS}`
    )

    if (!response.ok) {
      console.error('[TestButtonTracking] API error getting user stats:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[TestButtonTracking] Error getting user stats:', error)
    return null
  }
}

/**
 * Get global statistics
 * @returns {Promise<Object>} Global statistics
 */
export const getGlobalStats = async () => {
  try {
    const response = await fetch(`${TRACKING_API_URL}/api/tracking/stats`)

    if (!response.ok) {
      console.error('[TestButtonTracking] API error getting global stats:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[TestButtonTracking] Error getting global stats:', error)
    return null
  }
}

/**
 * Export tracking data (for backup/analysis)
 * @returns {Promise<Object>} Full tracking data
 */
export const exportTrackingData = async () => {
  try {
    const response = await fetch(`${TRACKING_API_URL}/api/tracking/export`)

    if (!response.ok) {
      console.error('[TestButtonTracking] API error exporting data:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[TestButtonTracking] Error exporting data:', error)
    return null
  }
}

/**
 * Get the configured cooldown period in hours
 * @returns {number} Cooldown period in hours
 */
export const getCooldownHours = () => COOLDOWN_HOURS
