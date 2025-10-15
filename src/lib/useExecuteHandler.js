

    import { useState, useEffect, useMemo, useRef } from 'preact/hooks'
    import { KeyTypes } from '@aioha/aioha'
    import { useAioha } from '@aioha/providers/react'
    import { playBeep } from './beep.js'
    import { useVscPoll } from './useVscPoll.js'
    
    const RC_LIMIT_DEFAULT = 10000
    
  
    export default function useExecuteHandler({  contract, fn, params }) {
      const { aioha, user, provider, otherUsers } = useAioha()
      const { pollTx } = useVscPoll()
    
      // UI + async state
      const [pending, setPending] = useState(false)
      const [waiting, setWaiting] = useState(false)
      const [waitingDots, setWaitingDots] = useState('')
      const intervalRef = useRef(null)
      // inside your component that holds logs
    const [logs, setLogs] = useState(() => {
      // ✅ Load stored logs if available
      const saved = sessionStorage.getItem('terminalLogs')
      return saved ? JSON.parse(saved) : []
    })
    
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
    
      /** Adds a new entry to the terminal log. */
      const appendLog = (text) => {
      setLogs((prev) => {
        const updated = [...prev, text]
        // ✅ store in sessionStorage so it survives re-renders and reloads
        sessionStorage.setItem('terminalLogs', JSON.stringify(updated))
        return updated
      })
    }
    
    
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
    
        // ✅ universal defaults
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
              params?.[first?.name] ??
              getDefaultValue(first ?? { type: 'string' })
            return { payload: val.toString(), intents }
          }
    
          case 'csv': {
            const delimiter = fn.delimeter ?? ','
            const keyDelimiter = fn.keyDelimeter ?? ':'
            const str = ps
              .filter((p) => p.type !== 'vscIntent')
              .map((p) => {
                const val =
                  params?.[p.name] ?? getDefaultValue(p)
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
    
        // fill defaults
        if (value === undefined || value === null || value === '') {
          value = getDefaultValue(p)
        }
    
        // meta shaping (unchanged)
        const metaAsArray = p.metaAsArray ?? metaAsArrayGlobal
        if (p.type?.startsWith('meta-')) {
          if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
              // pass
            } else if (metaAsArray) {
              value = Object.entries(value).map(([k, v]) => ({ key: k, val: v }))
            } else {
              value = Object.fromEntries(Object.entries(value))
            }
          }
        }
    
        // 🔧 type coercion for JSON mode
        if (p.asString) {
          // force string if requested
          value = value != null ? value.toString() : ''
        } else {
          // otherwise coerce to the real type
          if (p.type === 'number') {
            // turn "123" -> 123; fallback to 0 on NaN/empty
            const n = Number(value)
            value = Number.isFinite(n) ? n : 0
          } else if (p.type === 'bool') {
            // ensure boolean (handles weird string cases)
            value = value === true || value === 'true' || value === 1 || value === '1'
          }
          // strings/addresses stay as-is here
        }
    
        setDeep(obj, keyPath, value)
      })
    
      const jsonString = JSON.stringify(obj)
      return { payload: jsonString, intents }
    }
    
        }
      }
    
    
    
    
    
    
      /**
       * Validates whether all mandatory parameters have been filled.
       * Used to enable or disable the “Send” button.
       */
      const allMandatoryFilled = useMemo(() => {
        if (!fn) return false
        const mandatoryParams = fn.parameters?.filter((p) => p.mandatory) || []
        return mandatoryParams.every(
          (p) => params[p.name] && params[p.name].toString().trim() !== ''
        )
      }, [fn, params])
    
      /**
       * Executes the selected contract function:
       *  1. Builds the payload from user input.
       *  2. Signs and broadcasts the transaction.
       *  3. Starts polling for confirmation.
       *  4. Updates the terminal logs in real-time.
       */
      async function handleSend() {
        if (!contract || !fn || !allMandatoryFilled) return
    
        setPending(true)
        console.log(aioha.getCurrentProvider())
        var startingMessages = ['▶ Signing and broadcasting…']
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
    
          // We only send the *payload* string to the chain call.
          const res = await aioha.vscCallContract(
            contract.vscId,
            fn.name,
            payload, // ✅ send only the payload content
            RC_LIMIT_DEFAULT,
            intents, // ✅ pass intents separately
            KeyTypes.Active
          )
    
    
          if (res?.success) {
            // successful broadcast
            playBeep(880, 50, 'square')
            const txid = res.result
            appendLog(`⬢ Broadcast successful!`)
            appendLog(`🗒 TXID: ${txid}`)
            setWaiting(true)
    
            let vscStarted = false
    
            // poll for transaction execution logs
            await pollTx(txid, (line) => {
              if (!vscStarted) {
                vscStarted = true
                setWaiting(false)
              }
    
              // update or append logs depending on the message type
              const isVSCProgressLine = [
                '⧖ Waiting for VSC execution',
                '⬢ VSC contract executed successfully',
                '✘ VSC contract failed.'
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
            // broadcast failed before hitting the chain
            playBeep(250, 200, 'sawtooth')
            appendLog(`✘ Broadcast failed: ${res?.error || 'Unknown error'}`)
          }
        } catch (e) {
          // runtime or network error
          playBeep(250, 200, 'sawtooth')
          appendLog(`✘ Error: ${e?.message || e}`)
        } finally {
          setPending(false)
        }
      }
    
      /**
       * Generates a live JSON preview of the request payload.
       * Used for the “Payload Preview” panel in the terminal UI.
       */
    const jsonPreview = useMemo(() => {
      if (!fn || !contract) return '{}'
      const { payload, intents } = buildPayload(fn, params)
    
      // Minify and collapse whitespace
      const raw = JSON.stringify(
        {
          contract_id: contract.vscId,
          action: fn.name,
          payload,
          ...(intents.length > 0 && { intents }),
          rcLimit: RC_LIMIT_DEFAULT,
        }
      )
    
      // Replace any extra spaces, tabs, or newlines with a single space
      return raw.replace(/\s+/g, ' ')
    }, [contract, fn, params])
    
    
      // Hook return values for the UI components
      return {
        logs,
        pending,
        waiting,
        waitingDots,
        jsonPreview,
        handleSend,
        allMandatoryFilled
      }
    }
    