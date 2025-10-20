import { useState, useEffect, useMemo, useRef } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import { useAioha } from '@aioha/providers/react'
import { playBeep } from './beep.js'
import { useVscPoll } from './useVscPoll.js'
import { useVscQuery } from './useVscQuery.js'

const RC_LIMIT_DEFAULT = 10000

export default function useExecuteHandler({ contract, fn, params }) {
  const { aioha, user } = useAioha()
  const { pollTx } = useVscPoll()
  const { runQuery } = useVscQuery()

  const [pending, setPending] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [waitingDots, setWaitingDots] = useState('')
  const intervalRef = useRef(null)
  const [balances, setBalances] = useState({ hive: 0, hbd: 0 })

  const [logs, setLogs] = useState(() => {
    const saved = sessionStorage.getItem('terminalLogs')
    return saved ? JSON.parse(saved) : []
  })

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

    switch (fn.parse) {
      case 'raw': {
        const first = ps.find((p) => p.type !== 'vscIntent') ?? ps[0]
        const val =
          params?.[first?.name] ?? getDefaultValue(first ?? { type: 'string' })
        return { payload: val != null ? val.toString() : '', intents }
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

        return { payload: str, intents }
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
        return { payload: jsonString, intents }
      }
    }
  }

  /**
   * ✅ Validate all mandatory params, including balance check
   */
  const allMandatoryFilled = useMemo(() => {
    if (!fn) return false

    return fn.parameters?.every((p) => {
      if (!p.mandatory) return true

      const val = params[p.name]

      // Handle vscIntent specifically
      if (p.type === 'vscIntent') {
        if (!val || val.amount === '' || isNaN(parseFloat(val.amount))) return false

        const amount = parseFloat(String(val.amount).replace(',', '.'))
        const available = val.asset === 'HIVE' ? balances.hive : balances.hbd

        // ❌ Insufficient balance
        if (amount > available) return false
        return true
      }

      // Regular check
      return val !== '' && val !== undefined && val !== null
    })
  }, [params, fn, balances])

  /**
   * Executes the contract function
   */
  async function handleSend() {
    if (!contract || !fn || !allMandatoryFilled) return

    setPending(true)
    let startingMessages = ['▶ Signing and broadcasting…']
    if (aioha.getCurrentProvider() == 'hiveauth') {
      startingMessages.push('(accept tx via HiveAuth)')
    }
    setLogs((prev) => {
      const updated = [...prev, ...startingMessages]
      sessionStorage.setItem('terminalLogs', JSON.stringify(updated))
      return updated
    })
    setWaiting(false)

    try {
      const { payload, intents } = buildPayload(fn, params)
      const res = await aioha.vscCallContract(
        contract.vscId,
        fn.name,
        payload,
        RC_LIMIT_DEFAULT,
        intents,
        KeyTypes.Active
      )

      if (res?.success) {
        playBeep(880, 50, 'square')
        const txid = res.result
        appendLog(`⬢ Broadcast successful!`)
        appendLog(`🗒 TXID: ${txid}`)
        setWaiting(true)

        let vscStarted = false
        await pollTx(txid, (line) => {
          if (!vscStarted) {
            vscStarted = true
            setWaiting(false)
          }

          const isVSCProgressLine = [
            '⧖ Waiting for VSC execution',
            '⬢ VSC contract executed successfully',
            '✘ VSC contract failed.',
          ].some((prefix) => line.startsWith(prefix))

          if (isVSCProgressLine) {
            setLogs((prev) => {
              const updated = [...prev]
              if (/^⧖ Waiting for VSC execution/.test(updated.at(-1))) {
                updated[updated.length - 1] = line
              } else updated.push(line)
              return updated
            })
          } else {
            appendLog(line)
          }
        })

        appendLog('⬢ Transaction confirmed!')
      } else {
        playBeep(250, 200, 'sawtooth')
        appendLog(`✘ Broadcast failed: ${res?.error || 'Unknown error'}`)
      }
    } catch (e) {
      playBeep(250, 200, 'sawtooth')
      appendLog(`✘ Error: ${e?.message || e}`)
    } finally {
      setPending(false)
    }
  }

  const jsonPreview = useMemo(() => {
    if (!fn || !contract) return '{}'
    const { payload, intents } = buildPayload(fn, params)
    const raw = JSON.stringify({
      contract_id: contract.vscId,
      action: fn.name,
      payload,
      ...(intents.length > 0 && { intents }),
      rcLimit: RC_LIMIT_DEFAULT,
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
