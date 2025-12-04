import { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import { useAioha } from '@aioha/providers/react'
import { playBeep } from './beep.js'
import { useVscQuery } from './useVscQuery.js'

import { TransactionContext } from '../transactions/context';

import { PopupContext } from '../popup/context.js'

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

export default function useExecuteHandler({ contract, fn, params, disablePreview = false }) {
  const { openPopup } = useContext(PopupContext)

  const { aioha, user } = useAioha()
  const { runQuery } = useVscQuery()
  const { addTransaction, state } = useContext(TransactionContext);

  const [pending, setPending] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [waitingDots, setWaitingDots] = useState('')
  const intervalRef = useRef(null)
  const [balances, setBalances] = useState({ hive: 0, hbd: 0 })

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
      if (!user) return
      const QUERY = `
        query GetBalances($acc: String!) {
          bal: getAccountBalance(account: $acc) {
            hive
            hbd
          }
        }
      `
      const { data, error } = await runQuery(QUERY, { acc: hiveUser })
      if (!error && data?.bal) {
        setBalances({
          hive: Number(data.bal.hive) / 1000,
          hbd: Number(data.bal.hbd) / 1000,
        })
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
      if (!val || typeof val !== 'object') return
      const amount = (val.amount ?? '').toString()
      const asset = (val.asset ?? '').toString().toLowerCase()
      if (amount !== '' && asset) {
        intents.push({
          type: 'transfer.allow',
          args: { limit: amount, token: asset },
        })
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

    const getDefaultValue = (p) => {
      if (p.type === 'bool') return false
      if (p.type === 'number') return 0
      if (p.type?.startsWith('meta-')) return {}
      if (p.type === 'address') return 'hive:'
      return ''
    }

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
          payload += `|${params?.__gameCell?.replace(',', '|')}`

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
        const first = ps.find((p) => p.type !== 'vscIntent') ?? ps[0]
        const val =
          params?.[first?.name] ?? getDefaultValue(first ?? { type: 'string' })
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

        const str = ps
          .filter((p) => p.type !== 'vscIntent')
          .map((p) => {
            let val = params?.[p.name] ?? getDefaultValue(p)

            // Pull from parameter-level config, fallback to standard values
            const trueOut = p.boolTrue != null ? String(p.boolTrue) : 'true'
            const falseOut = p.boolFalse != null ? String(p.boolFalse) : 'false'

            // Process boolean types using parameter-level output
            if (isBoolType(p)) {
              const parsed = toBool(val)
              if (parsed === true) val = trueOut
              else if (parsed === false) val = falseOut
              // else leave val as-is (fallback)
            }

            // Ensure val is a string
            if (val !== null && val !== undefined && typeof val !== 'string') {
              val = String(val)
            }

            // Return value-only if excludeKeys is true
            if (excludeKeys) {
              return val
            }

            // Normal key:value format
            return `${p.payloadName || p.name}${keyDelimiter}${val}`
          })
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
            value = getDefaultValue(p)
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
        return { payload: jsonString, intents, action }
      }
    }
  }

  const areMandatoryFilled = useCallback(
    (inputParams = params) => {
      if (!fn) return false

      if (fn?.parse === 'game') {
        const action = inputParams?.__gameAction
        if (!action) return false

        const requiresGameId = action !== 'g_create'
        if (requiresGameId && !inputParams?.__gameId) {
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

          if (!joinAsset) return false
          const available = joinAsset === 'HIVE' ? balances.hive : balances.hbd
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
        const val = inputParams?.[p.name]

        if (p.type === 'vscIntent') {
          if (!val || val.amount === '' || isNaN(parseFloat(val.amount))) return false

          const amount = parseFloat(String(val.amount).replace(',', '.'))
          const available = val.asset === 'HIVE' ? balances.hive : balances.hbd
          if (amount > available) return false
          return true
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
          if (!val || val.amount === '' || isNaN(parseFloat(val.amount))) {
            issues.push(`Missing amount for "${p.name}"`)
            return
          }
          const amount = parseFloat(String(val.amount).replace(',', '.'))
          const available = (val.asset === 'HIVE' ? balances.hive : balances.hbd) || 0
          if (amount > available) {
            issues.push(
              `Insufficient balance for "${p.name}": need ${formatAmt(amount)} ${val.asset || ''}, have ${formatAmt(available)}`
            )
          }
          return
        }
        if (val === '' || val === undefined || val === null) {
          issues.push(`Missing value for "${p.name}"`)
        }
      })
      return issues
    },
    [fn, balances, params]
  )

  /**
   * Executes the contract function
   */
  async function handleSend(overrideParams = null) {
    const effectiveParams = overrideParams ? { ...params, ...overrideParams } : params
    const mandatoryOk = areMandatoryFilled(effectiveParams)

    if (!contract || !fn || !mandatoryOk) {
      if (!contract) {
        console.warn('[useExecuteHandler] ❌ send aborted — missing contract')
        return
      }

      if (!fn) {
        console.warn('[useExecuteHandler] ❌ send aborted — missing function definition (fn)')
        return
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
        return
      }

      return
    }

    setPending(true)

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
  }
}
