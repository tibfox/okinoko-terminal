import { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import { useAioha } from '@aioha/providers/react'
import { playBeep } from './beep.js'
import { useVscQuery } from './useVscQuery.js'

import { TransactionContext } from '../transactions/context';

import { PopupContext } from '../popup/context.js'

const getDefaultValue = (p) => {
  if (!p) return ''
  // Check for explicit default value first
  if (p.default !== undefined) return p.default
  if (p.type === 'bool' || p.type === 'boolean') return false
  if (p.type === 'number') return 0
  if (p.type?.startsWith('meta-')) return {}
  if (p.type === 'address') return 'hive:'
  return ''
}

const getMandatoryDefault = (p) => {
  if (!p?.mandatory) return ''
  return getDefaultValue(p)
}

const successBeep = 800
const successLength = 100
const failureBeep = 270
const failureLength = 400
const TONE_COUNT = 2
const TONE_PAUSE = 300 // ms between tones to keep the cue snappy


const RC_LIMIT_DEFAULT = 10000

const resolveRcLimit = (val) => {
  const num = Number(val)
  if (Number.isFinite(num) && num > 0) {
    return Math.floor(num)
  }
  return RC_LIMIT_DEFAULT
}

const attachRcLimit = (payload, rcLimit) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...payload, rcLimit }
  }
  // For string/array payloads, leave untouched to avoid spreading characters
  return payload
}

export default function useExecuteHandler({ contract, fn, params, disablePreview = false, onTransactionSigned }) {
  const { openPopup, closePopup } = useContext(PopupContext)

  const { aioha, user } = useAioha()
  const { runQuery } = useVscQuery()
  const { addTransaction, state } = useContext(TransactionContext);

  const [pending, setPending] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [waitingDots, setWaitingDots] = useState('')
  const intervalRef = useRef(null)
  const [balances, setBalances] = useState({ hive: 0, hbd: 0, hbd_savings: 0 })

  // Ref to store pending transaction params when login is required
  const pendingTxRef = useRef(null)

  const [logs, setLogs] = useState(() => {
    const saved = sessionStorage.getItem('terminalLogs')
    return saved ? JSON.parse(saved) : []
  })
  const playFailureChime = useCallback(() => {
    const interval = failureLength + TONE_PAUSE
    for (let i = 0; i < TONE_COUNT; i += 1) {
      setTimeout(() => playBeep(failureBeep - i * 80, failureLength + i * failureLength, 'sawtooth'), i * interval)
    }
  }, [])

  const playSuccessChime = useCallback(() => {
    const interval = successLength + TONE_PAUSE
    for (let i = 0; i < TONE_COUNT; i += 1) {
      setTimeout(() => playBeep(successBeep + i * 80, successLength + i * successLength, 'sawtooth'), i * interval)
    }
  }, [])

  const hiveUser = user?.startsWith('hive:') ? user : user ? `hive:${user}` : ''

  // === Fetch HIVE/HBD balances once user is known ===
  useEffect(() => {
    async function fetchBalances() {
      if (!user) {
        console.log('[useExecuteHandler] No user, skipping balance fetch')
        return
      }
      console.log('[useExecuteHandler] Fetching balances for user:', hiveUser)
      const QUERY = `
        query GetBalances($acc: String!) {
          bal: getAccountBalance(account: $acc) {
            hive
            hbd
            hbd_savings
          }
        }
      `
      const { data, error } = await runQuery(QUERY, { acc: hiveUser })
      if (error) {
        console.error('[useExecuteHandler] Error fetching balances:', error)
      }
      if (!error && data?.bal) {
        const newBalances = {
          hive: Number(data.bal.hive) / 1000,
          hbd: Number(data.bal.hbd) / 1000,
          hbd_savings: Number(data.bal.hbd_savings) / 1000,
        }
        console.log('[useExecuteHandler] Balances fetched:', newBalances)
        setBalances(newBalances)
      } else {
        console.log('[useExecuteHandler] No balance data returned')
      }
    }
    fetchBalances()
  }, [user])

  // Waiting animation
  useEffect(() => {
    if (waiting) {
      let count = 0
      intervalRef.current = setInterval(() => {
        count = (count + 1) % 4
        setWaitingDots('.'.repeat(count))
      }, 600)
    } else {
      setWaitingDots('')
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [waiting])

  // Logging helper
  const appendLog = (text) => {
    setLogs((prev) => {
      const updated = [...prev, text]
      sessionStorage.setItem('terminalLogs', JSON.stringify(updated))
      return updated
    })
  }




  // Payload builder
  const buildPayload = (fn, params) => {
    console.log('creating payload for ' + fn.name)
    if (!fn) return { payload: '', intents: [] }

    const ps = fn.parameters ?? []
    const intents = []

    const pushIntentFromValue = (val) => {
      console.log('pushIntentFromValue called with:', val)
      if (!val || typeof val !== 'object') return

      // Check if this is a multi-intent format { hive: '10.000', hbd: '5.000' }
      // Prioritize multi-intent detection when hive or hbd properties exist
      const hasMultiIntent = val.hasOwnProperty('hive') || val.hasOwnProperty('hbd')
      console.log('hasMultiIntent:', hasMultiIntent, 'val:', val)

      if (hasMultiIntent) {
        // Multi-intent: iterate over each asset
        Object.keys(val).forEach(asset => {
          const amount = (val[asset] ?? '').toString().trim()
          const parsedAmount = parseFloat(amount)
          console.log(`Multi-intent: ${asset} = "${amount}" (parsed: ${parsedAmount})`)
          // Skip if amount is empty, not a valid number, or zero
          if (amount !== '' && (asset === 'hive' || asset === 'hbd') && !isNaN(parsedAmount) && parsedAmount > 0) {
            console.log(`Adding intent for ${asset}: ${amount}`)
            intents.push({
              type: 'transfer.allow',
              args: { limit: amount, token: asset.toLowerCase() },
            })
          }
        })
      } else {
        // Single intent: { amount: '10.000', asset: 'HIVE' }
        const amount = (val.amount ?? '').toString()
        const asset = (val.asset ?? '').toString().toLowerCase()
        const parsedAmount = parseFloat(amount)
        console.log(`Single intent: ${asset} = ${amount} (parsed: ${parsedAmount})`)
        // Skip if amount is empty, not a valid number, or zero
        if (amount !== '' && asset && !isNaN(parsedAmount) && parsedAmount > 0) {
          intents.push({
            type: 'transfer.allow',
            args: { limit: amount, token: asset },
          })
        }
      }
    }

    ps.forEach((p) => {
      if (p.type === 'vscIntent') pushIntentFromValue(params?.[p.name])
    })

    const setDeep = (target, path, value) => {
      const keys = path.split('.')
      let current = target
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        if (i === keys.length - 1) current[key] = value
        else {
          if (typeof current[key] !== 'object' || current[key] === null)
            current[key] = {}
          current = current[key]
        }
      }
    }

    const metaAsArrayGlobal = fn?.metaAsArray ?? false

    var action = fn.name
    switch (fn.parse) {

      case "game": {
        action = params?.__gameAction
        const gameId = params?.__gameId
        var payload = `${gameId}`
        var intent
        // dynamic move index example
        if (action === "g_join") {
          console.log('Building intent for g_join')
          const intentAmount = params?.__gameIntentAmount

          if (intentAmount && !isNaN(parseFloat(intentAmount))) {
            if (!params?.__gameFmpEnabled) {
              console.log('No First Move Purchase enabled, setting intent to intent amount only')
              intent = { token: params?.__gameIntentAsset, limit: parseFloat(intentAmount).toFixed(3) }
            } else {
              console.log('First Move Purchase enabled, setting intent to total amount (intent + fmp)')
              const totalAmount = parseFloat(intentAmount) + parseFloat(params?.__gameFirstMovePurchase || 0)
              console.log('Total amount to intent:', totalAmount)
              intent = { token: params?.__gameIntentAsset, limit: totalAmount.toFixed(3) }
            }
          }

        }

        if (action === "g_create") {
          console.log('Building intent for g_create')
          const gameType = params?.__gameCreateType || ''
          const name = params?.__gameCreateName || ''
          payload = `${gameType}|${name}|`
          const createBet = params?.__gameCreateBet
          if (createBet && !isNaN(parseFloat(createBet.amount))) {
            intent = { token: createBet.asset, limit: parseFloat(createBet.amount).toFixed(3) }
          }
          if (params?.__gameFmpEnabled && !isNaN(parseFloat(params?.__gameCreateFmp))) {
            const fmp = parseFloat(params?.__gameCreateFmp)
            payload += `${fmp.toFixed(3)}`
          }
        }



        if (action === "g_resign" || action === "g_timeout") {
          // do nothing - we already have the game as payload
        }

        if (action === "g_move") {
          const moveVal = params?.__gameCell
          payload += `|${moveVal ? moveVal.replace(',', '|') : ''}`

        }
        if (action === "g_swap") {
          const op = params?.__gameSwapOp || ''
          payload += `|${op}`
          const extra = params?.__gameSwapArgs
          const parts = Array.isArray(extra)
            ? extra
            : typeof extra === 'string' && extra
              ? [extra]
              : []
          parts.filter(Boolean).forEach((part) => {
            payload += `|${part}`
          })
        }

        const intents = []
        if (intent) {
          intents.push({
            type: "transfer.allow",
            args: {
              token: intent.token.toLowerCase(),
              limit: intent.limit
            }
          })
        }
        console.log('Game payload:', payload, ' Intents:', intents, ' Action:', action)
        console.log('Game payload:', payload, ' Intents:', intents, ' Action:', action)
        return { payload: payload, intents, action }
      }

      case 'raw': {
        const first = ps.find((p) => p.type !== 'vscIntent')
        const val = first
          ? (params?.[first?.name] ?? getMandatoryDefault(first))
          : ''
        console.log('action: ' + action)
        return { payload: val != null ? val.toString() : '', intents, action }
      }

      case 'csv': {
        const delimiter = fn.delimiter ?? ','
        const keyDelimiter = fn.keyDelimiter ?? ':'
        const excludeKeys = fn.excludeKeys ?? false

        // Utility to normalize values to a real boolean (true/false) if possible
        function toBool(v) {
          if (v === true || v === false) return v
          if (v === 1 || v === '1') return true
          if (v === 0 || v === '0') return false
          if (typeof v === 'string') {
            const s = v.trim().toLowerCase()
            if (s === 'true' || s === 't' || s === 'yes' || s === 'y' || s === 'on') return true
            if (s === 'false' || s === 'f' || s === 'no' || s === 'n' || s === 'off') return false
          }
          return null
        }

        function isBoolType(p) {
          return p && (p.type === 'bool' || p.type === 'boolean')
        }

        let paramList = ps
        if (fn.name === 'create_lottery') {
          const donationAccountParam = ps.find(
            (p) => (p.payloadName || '').toLowerCase() === 'donationaccount'
          )
          const donationPercentParam = ps.find(
            (p) => (p.payloadName || '').toLowerCase() === 'donationpercent'
          )
          const donationAccountVal =
            (donationAccountParam &&
              (params?.[donationAccountParam.name] ??
                params?.[donationAccountParam.payloadName || donationAccountParam.name])) ||
            ''
          const donationPercentVal =
            (donationPercentParam &&
              (params?.[donationPercentParam.name] ??
                params?.[donationPercentParam.payloadName || donationPercentParam.name])) ||
            ''
          const hasDonationAccount = String(donationAccountVal || '').trim() !== ''
          const donationPercentNum = parseFloat(String(donationPercentVal || '').replace(',', '.'))
          const hasDonationPercent = Number.isFinite(donationPercentNum) && donationPercentNum > 0
          if (!hasDonationAccount && !hasDonationPercent) {
            paramList = ps.filter(
              (p) =>
                p !== donationAccountParam &&
                p !== donationPercentParam
            )
          }
        }

        const parts = paramList
          .filter((p) => p.type !== 'vscIntent')
          .map((p) => {
            // Check both name and payloadName for the value
            let val = params?.[p.name] ?? params?.[p.payloadName]
            if (val === undefined || val === null || val === '') {
              val = getMandatoryDefault(p)
            }

            // Special handling for winners field in split_prize_defined
            if ((fn.name === 'split_prize_defined' || fn.vscId === 'vsc1BU9JeZG4z4z1HWn5sH25RS3THNTsEnXXhb') &&
                ((p.payloadName || '').toLowerCase() === 'winners' || (p.name || '').toLowerCase().includes('winner'))) {
              if (Array.isArray(val) && val.length > 0) {
                // Serialize winners to format: addr1#(amt1#asset1,amt2#asset2);addr2#(amt1#asset1)
                const winnerStrings = val.map(winner => {
                  if (!winner.address || !winner.prizes || winner.prizes.length === 0) {
                    return ''
                  }

                  const address = winner.address
                  const prizes = winner.prizes.filter(p => p.amount && parseFloat(p.amount) > 0)

                  if (prizes.length === 0) {
                    return ''
                  }

                  // Format each prize
                  const prizeStrings = prizes.map(prize => {
                    const amount = parseFloat(prize.amount)
                    const asset = prize.asset
                    const formatted = prize.isFixed ? amount.toFixed(3) : amount.toFixed(1)
                    return prize.isFixed ? `${formatted}#${asset}#fixed` : `${formatted}#${asset}`
                  })

                  // If multiple prizes, wrap in parentheses
                  if (prizeStrings.length > 1) {
                    return `${address}#(${prizeStrings.join(',')})`
                  } else {
                    return `${address}#${prizeStrings[0]}`
                  }
                }).filter(Boolean)

                val = winnerStrings.join(';')
              } else {
                val = ''
              }
            }

            // Pull from parameter-level config, fallback to standard values
            const trueOut = p.boolTrue != null ? String(p.boolTrue) : 'true'
            const falseOut = p.boolFalse != null ? String(p.boolFalse) : 'false'

            // Process boolean types using parameter-level output
            if (isBoolType(p)) {
              const parsed = toBool(val)
              if (parsed === true) val = trueOut
              else if (parsed === false || parsed === null || parsed === undefined || val === '') val = falseOut
            }

            // Ensure val is a string
            if (val !== null && val !== undefined && typeof val !== 'string') {
              val = String(val)
            }

            // Return object with value and whether it's optional and empty
            const isEmpty = !p.mandatory && (val === '' || val === null || val === undefined)

            // Return value-only if excludeKeys is true
            if (excludeKeys) {
              return { val, isEmpty }
            }

            // Normal key:value format
            return { val: `${p.payloadName || p.name}${keyDelimiter}${val}`, isEmpty }
          })

        // Remove trailing empty optional parameters
        let lastNonEmptyIndex = parts.length - 1
        while (lastNonEmptyIndex >= 0 && parts[lastNonEmptyIndex].isEmpty) {
          lastNonEmptyIndex--
        }

        const str = parts
          .slice(0, lastNonEmptyIndex + 1)
          .map(p => p.val)
          .join(delimiter)

        return { payload: str, intents, action }
      }

      case 'json':
      default: {
        const obj = {}

        ps.forEach((p) => {
          if (p.type === 'vscIntent') return

          const keyPath = p.payloadName || p.name
          let value = params?.[p.name]

          if (value === undefined || value === null || value === '') {
            value = getMandatoryDefault(p)
          }

          const metaAsArray = p.metaAsArray ?? metaAsArrayGlobal
          if (p.type?.startsWith('meta-')) {
            if (value && typeof value === 'object') {
              if (Array.isArray(value)) {
                // do nothing
              } else if (metaAsArray) {
                value = Object.entries(value).map(([k, v]) => ({ key: k, val: v }))
              } else {
                value = Object.fromEntries(Object.entries(value))
              }
            }
          }

          if (p.asString) {
            value = value != null ? value.toString() : ''
          } else {
            if (p.type === 'number') {
              const n = Number(value)
              value = Number.isFinite(n) ? n : 0
            } else if (p.type === 'bool') {
              value =
                value === true ||
                value === 'true' ||
                value === 1 ||
                value === '1'
            }
          }

          setDeep(obj, keyPath, value)
        })

        const jsonString = JSON.stringify(obj)
        console.log('Returning payload with intents:', intents)
        return { payload: jsonString, intents, action }
      }
    }
  }

  const areMandatoryFilled = useCallback(
    (inputParams = params) => {
      if (!fn) return false

      if (fn?.parse === 'game') {
        const action = inputParams?.__gameAction
        if (!action) {
          return false
        }

        const requiresGameId = action !== 'g_create'
        if (requiresGameId && (inputParams?.__gameId === null || inputParams?.__gameId === undefined)) {
          return false
        }

        const betObj = inputParams?.__gameCreateBet
        const betAmount = betObj?.amount ? parseFloat(betObj.amount) : 0
        const betAsset = betObj?.asset
        const fmpEnabledCreate = inputParams?.__gameFmpEnabled
        const fmpAmountCreate = fmpEnabledCreate
          ? parseFloat(inputParams?.__gameCreateFmp || 0)
          : 0

        const joinAmount = inputParams?.__gameIntentAmount
          ? parseFloat(inputParams?.__gameIntentAmount)
          : 0
        const joinAsset = inputParams?.__gameIntentAsset
        const fmpEnabledJoin = inputParams?.__gameFmpEnabled
        const fmpAmountJoin = fmpEnabledJoin
          ? parseFloat(inputParams?.__gameFirstMovePurchase || 0)
          : 0

        if (action === 'g_create') {
          if (!inputParams?.__gameCreateType) return false

          if (fmpEnabledCreate && (Number.isNaN(fmpAmountCreate) || fmpAmountCreate < 0)) {
            return false
          }

          if (betAmount > 0) {
            if (!betAsset) return false
            const available = betAsset === 'HIVE' ? balances.hive : balances.hbd
            if (betAmount > available) return false
          }
          return true
        }

        if (action === 'g_join') {
          const normalizedJoinAmount = Number.isNaN(joinAmount) ? 0 : Math.max(0, joinAmount)
          const normalizedFmp = fmpEnabledJoin ? Math.max(0, Number.isNaN(fmpAmountJoin) ? 0 : fmpAmountJoin) : 0
          const total = normalizedJoinAmount + normalizedFmp

          if (total === 0) {
            return true
          }

          if (!joinAsset) {
            console.log('[g_join validation] No joinAsset defined')
            return false
          }
          const available = joinAsset === 'HIVE' ? balances.hive : balances.hbd
          console.log('[g_join validation]', {
            joinAmount: normalizedJoinAmount,
            fmpEnabled: fmpEnabledJoin,
            fmpAmount: normalizedFmp,
            total,
            joinAsset,
            available,
            balances,
            result: total <= available
          })
          return total <= available
        }

        if (action === 'g_move') {
          const moveVal = inputParams?.__gameCell
          return typeof moveVal === 'string' && moveVal.length > 0
        }

        if (action === 'g_swap') {
          const op = inputParams?.__gameSwapOp
          if (!op) return false
          const extra = inputParams?.__gameSwapArgs
          const parts = Array.isArray(extra)
            ? extra
            : typeof extra === 'string' && extra
              ? [extra]
              : []
          if (op === 'place' || op === 'add') {
            return parts.length > 0
          }
          if (op === 'choose' || op === 'color') {
            return parts.length === 1 && typeof parts[0] === 'string' && parts[0].length > 0
          }
          return false
        }

        if (action === 'g_resign' || action === 'g_timeout') {
          return true
        }

        return false
      }

      return (fn?.parameters ?? []).every((p) => {
        if (!p.mandatory) return true
        let val = inputParams?.[p.name]

        if ((val === undefined || val === null || val === '') && p.mandatory && (p.type === 'bool' || p.type === 'boolean')) {
          val = getDefaultValue(p)
        }

        if (p.type === 'vscIntent') {
          if (!val) return false

          // Check if this is multi-intent format
          const hasMultiIntent = !val.amount && !val.asset && (val.hive || val.hbd)

          if (hasMultiIntent) {
            // Multi-intent: check that at least one asset has valid amount
            const assets = Object.keys(val).filter(k => k === 'hive' || k === 'hbd')
            if (assets.length === 0) return false

            // Check that at least one asset has a valid amount
            const hasValidAmount = assets.some(asset => {
              const amountStr = val[asset]
              if (!amountStr || amountStr === '') return false
              const amount = parseFloat(String(amountStr).replace(',', '.'))
              if (isNaN(amount) || amount <= 0) return false
              const available = asset === 'hive' ? balances.hive : balances.hbd
              return amount <= available
            })

            return hasValidAmount
          } else {
            // Single intent
            if (val.amount === '' || isNaN(parseFloat(val.amount))) return false
            const amount = parseFloat(String(val.amount).replace(',', '.'))
            const available = val.asset === 'HIVE'
              ? balances.hive
              : val.asset === 'hbd_savings'
                ? balances.hbd_savings
                : balances.hbd
            if (amount > available) return false
            return true
          }
        }

        return val !== '' && val !== undefined && val !== null
      })
    },
    [fn, balances, params],
  )

  const allMandatoryFilled = areMandatoryFilled()

  const describeMissing = useCallback(
    (inputParams = params) => {
      if (!fn) return []
      const issues = []
      const formatAmt = (amt) => {
        const n = Number(amt)
        return Number.isFinite(n) ? n.toFixed(3) : String(amt ?? '')
      }
      ;(fn.parameters || []).forEach((p) => {
        if (!p.mandatory) return
        const val = inputParams?.[p.name]
        if (p.type === 'vscIntent') {
          // Check if this is a multi-intent format { hive: '10.000', hbd: '5.000' }
          const hasMultiIntent = val && typeof val === 'object' && !val.amount && !val.asset && (val.hive || val.hbd)

          if (hasMultiIntent) {
            // Multi-intent validation
            const assets = ['hive', 'hbd']
            let hasAnyAmount = false

            for (const asset of assets) {
              const amount = val[asset]
              if (amount && amount !== '') {
                hasAnyAmount = true
                const parsed = parseFloat(String(amount).replace(',', '.'))
                if (isNaN(parsed)) {
                  issues.push(`Invalid amount for "${p.name}" (${asset.toUpperCase()})`)
                } else {
                  const available = (asset === 'hive' ? balances.hive : balances.hbd) || 0
                  if (parsed > available) {
                    issues.push(
                      `Insufficient balance for "${p.name}" (${asset.toUpperCase()}): need ${formatAmt(parsed)} ${asset.toUpperCase()}, have ${formatAmt(available)}`
                    )
                  }
                }
              }
            }

            // If no amounts provided at all for multi-intent, that's an error
            if (!hasAnyAmount) {
              issues.push(`Missing amounts for "${p.name}" - please enter HIVE and/or HBD amounts`)
            }
          } else {
            // Single intent validation
            if (!val || val.amount === '' || isNaN(parseFloat(val.amount))) {
              issues.push(`Missing amount for "${p.name}"`)
              return
            }
            const amount = parseFloat(String(val.amount).replace(',', '.'))
            const available = (val.asset === 'HIVE'
              ? balances.hive
              : val.asset === 'hbd_savings'
                ? balances.hbd_savings
                : balances.hbd) || 0
            if (amount > available) {
              issues.push(
                `Insufficient balance for "${p.name}": need ${formatAmt(amount)} ${val.asset || ''}, have ${formatAmt(available)}`
              )
            }
          }
          return
        }
        let checkedVal = val
        if ((val === undefined || val === null || val === '') && p.mandatory && (p.type === 'bool' || p.type === 'boolean')) {
          checkedVal = getDefaultValue(p)
        }
        if (checkedVal === '' || checkedVal === undefined || checkedVal === null) {
          issues.push(`Missing value for "${p.name}"`)
        }
      })
      return issues
    },
    [fn, balances, params]
  )

  // State to track if login is required for a pending transaction
  const [loginRequired, setLoginRequired] = useState(false)

  /**
   * Called when user successfully logs in - executes the pending transaction
   */
  const executePendingTransaction = useCallback(() => {
    const storedParams = pendingTxRef.current
    if (storedParams) {
      pendingTxRef.current = null
      setLoginRequired(false)
      // Use setTimeout to ensure state is updated before executing
      setTimeout(() => {
        executeTransaction(storedParams)
      }, 100)
    }
  }, [])

  // Watch for user login and execute pending transaction
  useEffect(() => {
    if (user && pendingTxRef.current && loginRequired) {
      executePendingTransaction()
    }
  }, [user, loginRequired, executePendingTransaction])

  /**
   * Shows a login required state and stores the pending transaction
   */
  const showLoginRequired = useCallback((effectiveParams) => {
    // Store the pending transaction params
    pendingTxRef.current = effectiveParams
    setLoginRequired(true)
  }, [])

  /**
   * Internal function to execute the transaction (called after login check passes)
   */
  async function executeTransaction(effectiveParams) {
    const mandatoryOk = areMandatoryFilled(effectiveParams)

    if (!contract || !fn || !mandatoryOk) {
      if (!contract) {
        console.warn('[useExecuteHandler] ❌ send aborted — missing contract')
        return false
      }

      if (!fn) {
        console.warn('[useExecuteHandler] ❌ send aborted — missing function definition (fn)')
        return false
      }

      if (!mandatoryOk) {
        const details = describeMissing(effectiveParams)
        console.warn('[useExecuteHandler] ❌ send aborted — required params are missing or insufficient balance')
        if (details.length) {
          console.warn('Issues:', details.join('; '))
          appendLog(`✘ Missing/invalid: ${details.join('; ')}`)
        }
        console.warn('params:', effectiveParams)
        console.warn('fn.parameters:', fn.parameters)
        console.warn('balances:', balances)
        return false
      }

      return false
    }

    setPending(true)
    let success = false

    let startingMessages = ['▶ Signing and broadcasting L1…']
    if (aioha.getCurrentProvider() == 'hiveauth') {
      openPopup({
      title: "Approve in HiveAuth",
      body: "Please confirm the transaction in your HiveAuth app."
    })
      startingMessages.push('(accept tx via HiveAuth)')
    }
    setLogs((prev) => {
      const updated = [...prev, ...startingMessages]
      sessionStorage.setItem('terminalLogs', JSON.stringify(updated))
      return updated
    })
    setWaiting(false)

    try {
      const { payload, intents, action } = buildPayload(fn, effectiveParams)
      const rcLimit = resolveRcLimit(effectiveParams?.rcLimit)
      const payloadWithRc = attachRcLimit(payload, rcLimit)

      console.log('[useExecuteHandler] Payload:', payload, ' Intents:', intents, ' Action:', action)
      const res = await aioha.vscCallContract(
        contract.vscId,
        action,
        payloadWithRc,
        rcLimit,
        intents,
        KeyTypes.Active
      )

      if (res?.success) {
        playBeep(successBeep, successLength, 'sawtooth')
        const txid = res.result
        appendLog(`⬢ L1: Broadcast successful!`)
        appendLog(`🗒 L1: TXID: ${txid}`)
        setWaiting(true)
        success = true

        // Show feedback popup immediately after transaction is signed
        if (action === 'g_create') {
          openPopup({
            title: "Game Creation Pending",
            body: "Your game will be created with the next block."
          })
        } else if (action === 'g_move' || action === 'g_swap') {
          openPopup({
            title: "Move Submitted",
            body: "Your move will be processed with the next block."
          })
        }

        // Call the onTransactionSigned callback if provided
        if (onTransactionSigned) {
          onTransactionSigned(action, txid)
        }

        let vscStarted = false
        addTransaction({
          id: txid,
          status: 'pending',
          startedAt: Date.now(),
          action: action,
          payload: payloadWithRc,
          onStatus: (status, result) => {
            if (status === 'success') {
              playSuccessChime()
              appendLog('⬢ Magi: contract executed successfully.')
              if (result) appendLog('🗒 Magi: Return: ' + result)
            } else {
              playFailureChime()
              appendLog('✘ Magi: contract failed.')
              appendLog('🗒 Magi: Return: ' + JSON.stringify(result))
            }
          }
        })


        appendLog('🗒 L1: Transaction confirmed!')
        appendLog('⧖ Magi: Waiting for contract execution…')
      } else {
        playFailureChime()
        appendLog(`✘ L1: Broadcast failed: ${res?.error || 'Unknown error'}`)
      }
    } catch (e) {
      playFailureChime()
      appendLog(`✘ L1: Error: ${e?.message || e}`)
    } finally {
      setPending(false)
    }
    return success
  }

  /**
   * Clears the pending transaction and login required state
   */
  const clearPendingTransaction = useCallback(() => {
    pendingTxRef.current = null
    setLoginRequired(false)
  }, [])

  /**
   * Executes the contract function (checks login first)
   */
  async function handleSend(overrideParams = null) {
    const effectiveParams = overrideParams ? { ...params, ...overrideParams } : params

    // Check if user is logged in
    if (!user) {
      console.log('[useExecuteHandler] User not logged in, setting login required state')
      showLoginRequired(effectiveParams)
      return false
    }

    return executeTransaction(effectiveParams)
  }

  const jsonPreview = useMemo(() => {
    if (disablePreview || !fn || !contract) return '{}'
    const { payload, intents } = buildPayload(fn, params)
    const rcLimit = resolveRcLimit(params?.rcLimit)
    const payloadWithRc = attachRcLimit(payload, rcLimit)
    const raw = JSON.stringify({
      contract_id: contract.vscId,
      action: fn.name,
      payload: payloadWithRc,
      ...(intents.length > 0 && { intents }),
      rcLimit,
    })
    return raw.replace(/\s+/g, ' ')
  }, [contract, fn, params])

  return {
    logs,
    pending,
    waiting,
    waitingDots,
    jsonPreview,
    handleSend,
    allMandatoryFilled,
    describeMissing,
    balances,
    loginRequired,
    clearPendingTransaction,
  }
}
