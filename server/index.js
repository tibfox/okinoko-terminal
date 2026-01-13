/**
 * Simple Express server for Test Button Tracking API
 * Stores tracking data in a JSON file for persistence
 */

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.TRACKING_PORT || 3001
const DEFAULT_COOLDOWN_HOURS = 24

// Data file path
const DATA_DIR = path.join(__dirname, 'data')
const TRACKING_FILE = path.join(DATA_DIR, 'testButtonTracking.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize tracking file if it doesn't exist
const initializeDataFile = () => {
  if (!fs.existsSync(TRACKING_FILE)) {
    const initialData = {
      transactions: {},
      clicks: []
    }
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(initialData, null, 2))
    console.log('[Tracking Server] Initialized tracking data file')
  }
}

initializeDataFile()

// Middleware
app.use(cors())
app.use(express.json())

// Helper: Load tracking data
const loadTrackingData = () => {
  try {
    const data = fs.readFileSync(TRACKING_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('[Tracking Server] Error loading data:', error)
    return { transactions: {}, clicks: [] }
  }
}

// Helper: Save tracking data
const saveTrackingData = (data) => {
  try {
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('[Tracking Server] Error saving data:', error)
    return false
  }
}

// Helper: Parse cooldown hours from query param
const parseCooldownHours = (value) => {
  const num = parseFloat(value)
  if (Number.isFinite(num) && num > 0) {
    return num
  }
  return DEFAULT_COOLDOWN_HOURS
}

// Helper: Check if cooldown has passed since last transaction
const checkCooldown = (lastSentTimestamp, cooldownHours) => {
  if (!lastSentTimestamp) {
    return { canSend: true, timeUntilReset: null }
  }

  const lastSent = new Date(lastSentTimestamp)
  const now = new Date()
  const cooldownMs = cooldownHours * 60 * 60 * 1000
  const resetTime = new Date(lastSent.getTime() + cooldownMs)

  if (now >= resetTime) {
    return { canSend: true, timeUntilReset: null }
  }

  const diffMs = resetTime.getTime() - now.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return { canSend: false, timeUntilReset: { hours, minutes } }
}

// ============ API ENDPOINTS ============

/**
 * GET /api/tracking/can-send/:username
 * Check if a user can click the test button (based on last click time)
 * Query params:
 *   - cooldown: cooldown period in hours (default: 24)
 */
app.get('/api/tracking/can-send/:username', (req, res) => {
  const { username } = req.params
  const cooldownHours = parseCooldownHours(req.query.cooldown)
  const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username

  const data = loadTrackingData()
  const userRecord = data.transactions[normalizedUser]

  // Check cooldown based on last click timestamp
  const result = checkCooldown(userRecord?.lastClickTimestamp, cooldownHours)
  res.json(result)
})

/**
 * POST /api/tracking/click
 * Record a test button click and start the cooldown
 * Body: { username: string, cooldown?: number }
 */
app.post('/api/tracking/click', (req, res) => {
  const { username, cooldown } = req.body
  const cooldownHours = parseCooldownHours(cooldown)

  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }

  const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username
  const timestamp = new Date().toISOString()
  const clickId = `${normalizedUser}_${Date.now()}`

  const data = loadTrackingData()

  // Check if user is still in cooldown (based on last click, not transaction)
  const userRecord = data.transactions[normalizedUser]
  const cooldownCheck = checkCooldown(userRecord?.lastClickTimestamp, cooldownHours)
  if (!cooldownCheck.canSend) {
    return res.status(429).json({
      error: 'User is still in cooldown period',
      timeUntilReset: cooldownCheck.timeUntilReset
    })
  }

  // Update the last click timestamp for cooldown tracking
  if (!data.transactions[normalizedUser]) {
    data.transactions[normalizedUser] = {
      lastClickTimestamp: timestamp,
      count: 0,
      history: []
    }
  } else {
    data.transactions[normalizedUser].lastClickTimestamp = timestamp
  }

  data.clicks.push({
    id: clickId,
    username: normalizedUser,
    timestamp,
    completed: false
  })

  // Keep only the last 10000 click records
  if (data.clicks.length > 10000) {
    data.clicks = data.clicks.slice(-10000)
  }

  if (saveTrackingData(data)) {
    console.log(`[Tracking Server] Recorded click for user: ${normalizedUser}`)
    res.json({ success: true, clickId })
  } else {
    res.status(500).json({ error: 'Failed to save tracking data' })
  }
})

/**
 * POST /api/tracking/transaction
 * Record a successful transaction
 * Body: { username: string, clickId: string, cooldown?: number }
 */
app.post('/api/tracking/transaction', (req, res) => {
  const { username, clickId, cooldown } = req.body
  const cooldownHours = parseCooldownHours(cooldown)

  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }

  const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username
  const now = new Date()
  const timestamp = now.toISOString()

  const data = loadTrackingData()

  // Check if user is still in cooldown
  const existingRecord = data.transactions[normalizedUser]
  const cooldownCheck = checkCooldown(existingRecord?.lastSentTimestamp, cooldownHours)
  if (!cooldownCheck.canSend) {
    return res.status(429).json({
      error: 'User is still in cooldown period',
      timeUntilReset: cooldownCheck.timeUntilReset
    })
  }

  // Update transaction record
  if (!data.transactions[normalizedUser]) {
    data.transactions[normalizedUser] = {
      lastSentTimestamp: timestamp,
      count: 1,
      history: []
    }
  } else {
    data.transactions[normalizedUser].lastSentTimestamp = timestamp
    data.transactions[normalizedUser].count = (data.transactions[normalizedUser].count || 0) + 1
  }

  // Add to history
  if (!data.transactions[normalizedUser].history) {
    data.transactions[normalizedUser].history = []
  }
  data.transactions[normalizedUser].history.push({
    timestamp
  })
  // Keep last 100 entries per user
  if (data.transactions[normalizedUser].history.length > 100) {
    data.transactions[normalizedUser].history = data.transactions[normalizedUser].history.slice(-100)
  }

  // Mark click as completed
  if (clickId) {
    const clickIndex = data.clicks.findIndex(c => c.id === clickId)
    if (clickIndex !== -1) {
      data.clicks[clickIndex].completed = true
      data.clicks[clickIndex].completedAt = timestamp
    }
  }

  if (saveTrackingData(data)) {
    console.log(`[Tracking Server] Recorded transaction for user: ${normalizedUser}`)
    res.json({ success: true })
  } else {
    res.status(500).json({ error: 'Failed to save tracking data' })
  }
})

/**
 * GET /api/tracking/stats/:username
 * Get statistics for a specific user
 * Query params:
 *   - cooldown: cooldown period in hours (default: 24)
 */
app.get('/api/tracking/stats/:username', (req, res) => {
  const { username } = req.params
  const cooldownHours = parseCooldownHours(req.query.cooldown)
  const normalizedUser = username.startsWith('hive:') ? username.slice(5) : username

  const data = loadTrackingData()
  const txRecord = data.transactions[normalizedUser] || { count: 0, history: [] }
  const userClicks = data.clicks.filter(c => c.username === normalizedUser)
  const completedClicks = userClicks.filter(c => c.completed)
  const abandonedClicks = userClicks.filter(c => !c.completed)

  // Check cooldown based on last click timestamp
  const cooldownCheck = checkCooldown(txRecord.lastClickTimestamp, cooldownHours)

  res.json({
    totalTransactions: txRecord.count || 0,
    lastClickTimestamp: txRecord.lastClickTimestamp || null,
    lastSentTimestamp: txRecord.lastSentTimestamp || null,
    canSend: cooldownCheck.canSend,
    timeUntilReset: cooldownCheck.timeUntilReset,
    totalClicks: userClicks.length,
    completedClicks: completedClicks.length,
    abandonedClicks: abandonedClicks.length
  })
})

/**
 * GET /api/tracking/stats
 * Get global statistics
 */
app.get('/api/tracking/stats', (req, res) => {
  const data = loadTrackingData()

  const totalUsers = Object.keys(data.transactions).length
  const totalTransactions = Object.values(data.transactions).reduce((sum, u) => sum + (u.count || 0), 0)
  const totalClicks = data.clicks.length
  const completedClicks = data.clicks.filter(c => c.completed).length
  const abandonedClicks = data.clicks.filter(c => !c.completed).length

  res.json({
    totalUsers,
    totalTransactions,
    totalClicks,
    completedClicks,
    abandonedClicks,
    completionRate: totalClicks > 0 ? (completedClicks / totalClicks * 100).toFixed(1) + '%' : 'N/A'
  })
})

/**
 * GET /api/tracking/export
 * Export all tracking data (for backup/analysis)
 */
app.get('/api/tracking/export', (req, res) => {
  const data = loadTrackingData()
  res.json(data)
})

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`[Tracking Server] Running on http://localhost:${PORT}`)
  console.log(`[Tracking Server] Data file: ${TRACKING_FILE}`)
  console.log(`[Tracking Server] Default cooldown: ${DEFAULT_COOLDOWN_HOURS} hours`)
})
