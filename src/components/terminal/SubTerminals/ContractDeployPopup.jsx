import { useState, useMemo, useRef, useEffect } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../../common/FloatingLabelInput.jsx'
import NeonListDropdown from '../../common/NeonListDropdown.jsx'
import { startDeploy, subscribeToLogs, checkHealth } from '../../../lib/contractDeployApi.js'
import { useAssetSymbols, useNetworkType } from '../providers/NetworkTypeProvider.jsx'
import { CONTRACT_TEMPLATES, getTemplateWasmUrl, filterTemplatesByTag } from '../../../config/contractTemplates.js'

// Prefix for DAO contracts to enable on-chain discovery
const DAO_CONTRACT_PREFIX = 'shindao_'

export default function ContractDeployPopup({ aioha, user, description, filterTag, onProcessingChange }) {
  const assetSymbols = useAssetSymbols()
  const { networkConfig } = useNetworkType()
  const [name, setName] = useState('')
  const [wasmSource, setWasmSource] = useState('template') // 'template' | 'own'
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [wasmFile, setWasmFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [showHiveAuthMessage, setShowHiveAuthMessage] = useState(false)
  const [error, setError] = useState(null)
  const [txResult, setTxResult] = useState(null)
  const [logs, setLogs] = useState([])
  const [deploymentId, setDeploymentId] = useState(null)
  const [prepareResult, setPrepareResult] = useState(null)
  const fileInputRef = useRef(null)
  const logsEndRef = useRef(null)
  const cleanupRef = useRef(null)

  const normalizedUser = useMemo(() => {
    if (!user) return 'unknown'
    const normalized = user.startsWith('hive:') ? user.slice(5) : user
    return normalized
  }, [user])

  // For DAO contracts, automatically prefix with 'shindao_' for on-chain discovery
  const isDaoDeployment = filterTag === 'dao'
  const fullContractName = useMemo(() => {
    const trimmedName = name.trim()
    if (!trimmedName) return ''
    return isDaoDeployment ? `${DAO_CONTRACT_PREFIX}${trimmedName}` : trimmedName
  }, [name, isDaoDeployment])

  const isValidForm = useMemo(() => {
    const hasName = name.trim() !== ''
    const hasWasm = wasmSource === 'template'
      ? (selectedTemplate !== '' && !templatesLoading)
      : wasmFile !== null
    return hasName && hasWasm
  }, [name, wasmSource, selectedTemplate, wasmFile, templatesLoading])

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  // Notify parent about processing state changes (for close confirmation)
  useEffect(() => {
    onProcessingChange?.(isProcessing || isSigning)
  }, [isProcessing, isSigning, onProcessingChange])

  // Check backend health on mount and when network changes
  useEffect(() => {
    const runHealthCheck = async () => {
      const isHealthy = await checkHealth(networkConfig.contractDeployUrl)
      if (!isHealthy) {
        const errorMsg = 'Deployment backend is not available. Please contact tibfox for assistance.'
        setLogs([{
          level: 'ERROR',
          timestamp: new Date().toISOString(),
          message: errorMsg,
        }])
        setError(errorMsg)
      }
    }
    runHealthCheck()
  }, [networkConfig.contractDeployUrl])

  // Load available templates from config (filtered by tag if specified)
  useEffect(() => {
    const filteredTemplates = filterTemplatesByTag(CONTRACT_TEMPLATES, filterTag)
    setTemplates(filteredTemplates)
    // Auto-select first template
    if (filteredTemplates.length > 0) {
      setSelectedTemplate(filteredTemplates[0].id)
    }
    setTemplatesLoading(false)
  }, [filterTag])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setWasmFile(file)
      setError(null)
      setLogs([])
      setDeploymentId(null)
      setPrepareResult(null)
    }
  }

  const handleDeploy = async () => {
    if (!isValidForm || isProcessing) return

    setIsProcessing(true)
    setError(null)
    setLogs([])
    setPrepareResult(null)

    // Add initial log showing network and service URL
    const networkLabel = networkConfig.vscNetworkId === 'vsc-testnet' ? 'Magi Test Net' : 'Magi Main Net'
    setLogs([
      {
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message: `Deploying to ${networkLabel} (${networkConfig.vscNetworkId})`,
      },
      {
        level: 'DEBUG',
        timestamp: new Date().toISOString(),
        message: `Using deploy service: ${networkConfig.contractDeployUrl}`,
      },
    ])

    try {
      // Get the WASM file (either from template or user upload)
      let fileToUpload = wasmFile
      if (wasmSource === 'template') {
        const template = templates.find(t => t.id === selectedTemplate)
        if (!template) {
          setError('Template not found')
          setIsProcessing(false)
          return
        }
        // Fetch the WASM from GitHub
        const wasmUrl = getTemplateWasmUrl(template)
        setLogs(prev => [...prev, {
          level: 'INFO',
          timestamp: new Date().toISOString(),
          message: `Fetching template from GitHub: ${template.repo}`,
        }])
        const response = await fetch(wasmUrl)
        if (!response.ok) {
          setError(`Failed to load template from GitHub: ${response.status} ${response.statusText}`)
          setIsProcessing(false)
          return
        }
        const blob = await response.blob()
        fileToUpload = new File([blob], `${template.id}.wasm`, { type: 'application/wasm' })
      }

      // Step 1: Start the deployment and get deployment ID
      const startResult = await startDeploy({
        wasmFile: fileToUpload,
        name: fullContractName,
        owner: normalizedUser,
        dryRun: false,
        network: networkConfig.vscNetworkId,
        serviceUrl: networkConfig.contractDeployUrl,
      })

      if (startResult.error) {
        setError(startResult.error)
        setIsProcessing(false)
        return
      }

      const depId = startResult.deployment_id
      setDeploymentId(depId)

      // Step 2: Subscribe to logs via SSE
      const cleanup = subscribeToLogs(depId, {
        onLog: (logEntry) => {
          setLogs(prev => [...prev, logEntry])
        },
        onResult: (backendResult) => {
          // Store the result from backend (includes operations for signing)
          setPrepareResult(backendResult)

          // Automatically start signing if successful
          if (backendResult && backendResult.success) {
            signTransaction(backendResult)
          } else if (backendResult && !backendResult.success) {
            // Backend preparation failed
            const errorMsg = backendResult.error || backendResult.message || 'Deployment preparation failed'
            setLogs(prev => [...prev, {
              level: 'ERROR',
              timestamp: new Date().toISOString(),
              message: errorMsg,
            }])
            setError(errorMsg)
            setIsProcessing(false)
          }
        },
        onDone: () => {
          // Deployment stream complete
        },
        onError: (err) => {
          console.error('Log stream error:', err)
          const errorMsg = 'Lost connection to deployment service. Please contact tibfox for assistance.'
          setLogs(prev => [...prev, {
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            message: errorMsg,
          }])
          setError(errorMsg)
          setIsProcessing(false)
        },
      }, networkConfig.contractDeployUrl)

      cleanupRef.current = cleanup

    } catch (err) {
      console.error('Error starting deployment:', err)
      // Check if it's a network/fetch error (backend unavailable)
      const isNetworkError = err.message?.includes('fetch') ||
                             err.message?.includes('network') ||
                             err.name === 'TypeError' ||
                             err.message?.includes('Failed to fetch')
      const errorMsg = isNetworkError
        ? 'Deployment backend is not available. Please contact tibfox for assistance.'
        : `Error: ${err.message || 'Unknown error'}`
      // Add error to logs as a red line
      setLogs(prev => [...prev, {
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message: errorMsg,
      }])
      setError(errorMsg)
      setIsProcessing(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const getLogColor = (level) => {
    switch (level) {
      case 'ERROR': return '#ff4444'
      case 'DEBUG': return 'var(--color-primary-darker)'
      default: return 'var(--color-primary-lighter)'
    }
  }

  // Sign the transaction with aioha
  const signTransaction = async (result) => {
    const resultToSign = result || prepareResult
    if (!resultToSign || !resultToSign.operations || !aioha) {
      setError('No operations to sign or aioha not available')
      setIsProcessing(false)
      return
    }

    setIsSigning(true)
    setError(null)

    try {
      // Convert operations to aioha format
      // Replace {{username}} placeholder with actual user
      const ops = resultToSign.operations.map(op => {
        if (op.type === 'custom_json') {
          // Replace net_id in the JSON payload with the correct network ID
          let jsonStr = op.data.json
          try {
            const jsonData = JSON.parse(jsonStr)
            if (jsonData.net_id) {
              jsonData.net_id = networkConfig.vscNetworkId
              jsonStr = JSON.stringify(jsonData)
            }
          } catch (e) {
            console.error('Failed to parse custom_json payload:', e)
          }
          return [
            'custom_json',
            {
              required_auths: op.data.required_auths.map(a => a === '{{username}}' ? normalizedUser : a),
              required_posting_auths: op.data.required_posting_auths,
              id: op.data.id,
              json: jsonStr,
            }
          ]
        } else if (op.type === 'transfer') {
          // Replace HBD with correct asset symbol for testnet (TBD)
          let amount = op.data.amount
          if (networkConfig.vscNetworkId === 'vsc-testnet') {
            amount = amount.replace(' HBD', ` ${assetSymbols.HBD}`)
          }
          // Always use vsc.gateway (backend may incorrectly send vsc.testnet)
          let toAccount = op.data.to
          if (toAccount === 'vsc.testnet') {
            toAccount = 'vsc.gateway'
          }
          return [
            'transfer',
            {
              from: op.data.from === '{{username}}' ? normalizedUser : op.data.from,
              to: toAccount,
              amount: amount,
              memo: op.data.memo,
            }
          ]
        }
        return null
      }).filter(Boolean)

      console.log('Signing operations:', ops)

      // Check if using HiveAuth
      if (aioha.getCurrentUser()?.loginMethod === 'hiveauth') {
        setShowHiveAuthMessage(true)
      }

      // Sign with aioha
      const txResponse = await aioha.signAndBroadcastTx(ops, KeyTypes.Active)

      setShowHiveAuthMessage(false)

      if (txResponse.success) {
        setTxResult({
          success: true,
          txId: txResponse.result,
        })
      } else {
        setError(`Transaction failed: ${txResponse.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Sign transaction error:', err)
      setError(`Failed to sign: ${err.message || 'Unknown error'}`)
      setShowHiveAuthMessage(false)
    } finally {
      setIsSigning(false)
      setIsProcessing(false)
    }
  }

  // Show log view when processing, has logs, or has error (to keep error visible)
  const showLogView = isProcessing || logs.length > 0 || error

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!showLogView ? (
        <>
          {/* FORM VIEW */}
          <div style={{ fontSize: 'var(--font-size-base)', lineHeight: '1.5', color: 'var(--color-primary-lighter)' }}>
            {description || 'Deploy a WASM smart contract to the VSC network.'}
          </div>

          {/* WASM Source Tabs */}
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              type="button"
              onClick={() => setWasmSource('template')}
              style={{
                flex: 1,
                border: '1px solid var(--color-primary-darker)',
                borderRight: 'none',
                background: wasmSource === 'template' ? 'var(--color-primary-darkest)' : 'transparent',
                color: wasmSource === 'template' ? 'var(--color-primary)' : 'var(--color-primary-darker)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: 'calc(var(--font-size-base) * 0.9)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-family-base)',
                transition: 'all 0.2s ease',
              }}
            >
              Template WASM
            </button>
            <button
              type="button"
              onClick={() => setWasmSource('own')}
              style={{
                flex: 1,
                border: '1px solid var(--color-primary-darker)',
                background: wasmSource === 'own' ? 'var(--color-primary-darkest)' : 'transparent',
                color: wasmSource === 'own' ? 'var(--color-primary)' : 'var(--color-primary-darker)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: 'calc(var(--font-size-base) * 0.9)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-family-base)',
                transition: 'all 0.2s ease',
              }}
            >
              Own WASM
            </button>
          </div>

          {/* Template Selector */}
          {wasmSource === 'template' && (
            templatesLoading ? (
              <div style={{
                padding: '0.75rem 1rem',
                color: 'var(--color-primary-darker)',
                border: '1px solid var(--color-primary-darkest)',
                background: 'rgba(0, 0, 0, 0.6)',
              }}>
                Loading templates...
              </div>
            ) : (
              <NeonListDropdown
                options={templates.map(t => ({ value: t.id, label: t.label }))}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                placeholder="Select a template..."
              />
            )
          )}

          {/* File Upload (Own WASM) */}
          {wasmSource === 'own' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wasm"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1px solid var(--color-primary-darker)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: 'var(--color-primary-lighter)',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-base)',
                  letterSpacing: '0.1em',
                  textAlign: 'left',
                }}
              >
                {wasmFile ? wasmFile.name : 'Select WASM File...'}
              </button>
              {wasmFile && (
                <div style={{ fontSize: 'calc(var(--font-size-base) * 0.85)', color: 'var(--color-primary-darker)' }}>
                  Size: {(wasmFile.size / 1024).toFixed(2)} KB
                </div>
              )}
            </div>
          )}

          {/* Contract Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <FloatingLabelInput
              type="text"
              placeholder={isDaoDeployment ? 'shindao_my-dao' : 'my-contract'}
              label={isDaoDeployment ? 'DAO Contract Name *' : 'Contract Name *'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%' }}
            />
            {isDaoDeployment && (
              <div style={{
                fontSize: 'calc(var(--font-size-base) * 0.85)',
                color: 'var(--color-primary-darker)',
              }}>
                {name.trim()
                  ? <>Deploys as: <span style={{ color: 'var(--color-primary)' }}>{fullContractName}</span></>
                  : <>The shindao_ prefix will be added automatically</>
                }
              </div>
            )}
          </div>

          {/* Deploy Button */}
          <button
            type="button"
            onClick={handleDeploy}
            disabled={!isValidForm}
            style={{
              border: '1px solid var(--color-primary-darkest)',
              background: isValidForm ? 'var(--color-primary-darkest)' : 'transparent',
              color: isValidForm ? 'var(--color-primary)' : 'var(--color-primary-darker)',
              padding: '0.75rem 1rem',
              cursor: isValidForm ? 'pointer' : 'not-allowed',
              fontSize: 'var(--font-size-base)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-family-base)',
              transition: 'all 0.2s ease',
              opacity: isValidForm ? 1 : 0.4,
            }}
          >
            Deploy Contract
          </button>

          {/* Deployment Fee Notice */}
          <div style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-primary)',
            textAlign: 'center',
            fontWeight: 'bold',
          }}>
            Deployment Fee: 10 {assetSymbols.HBD} will be taken from your Hive L1 wallet
          </div>
        </>
      ) : (
        <>
          {/* LOG VIEW */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}>
            <div style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-primary-lighter)',
              fontWeight: 'bold',
            }}>
              {isSigning ? 'Signing Transaction...' : (isProcessing ? 'Deploying...' : (error ? 'Deployment Failed' : (txResult ? 'Transaction Broadcast!' : 'Deployment Complete')))}
            </div>
            <div style={{
              fontSize: 'calc(var(--font-size-base) * 0.75)',
              color: 'var(--color-primary-darker)',
              fontFamily: 'monospace',
            }}>
              {deploymentId?.substring(0, 8)}
            </div>
          </div>

          {/* Contract Info Summary */}
          <div style={{
            padding: '0.5rem',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--color-primary-darkest)',
          }}>
            <div style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-primary)',
              fontWeight: 'bold',
              marginBottom: '0.25rem',
            }}>
              Contract: {fullContractName}
            </div>
            <div style={{
              fontSize: 'calc(var(--font-size-base) * 0.85)',
              color: 'var(--color-primary-darker)',
            }}>
              File: {wasmSource === 'template'
                ? templates.find(t => t.id === selectedTemplate)?.label || selectedTemplate
                : `${wasmFile?.name} (${(wasmFile?.size / 1024).toFixed(1)} KB)`
              }
            </div>
          </div>

          {/* Real-time Logs */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--color-primary-darkest)',
            padding: '0.5rem',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
          }}
          className="neon-scroll deploy-logs"
          >
            <style>{`
              .deploy-logs {
                min-height: 193px;
                max-height: 270px;
              }
              @media (max-width: 768px) {
                .deploy-logs {
                  min-height: 149px;
                  max-height: 208px;
                }
              }
            `}</style>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--color-primary-darker)', fontStyle: 'italic' }}>
                Connecting to deployment service...
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    color: getLogColor(log.level),
                    padding: '2px 0',
                    wordBreak: 'break-word',
                  }}
                >
                  <span style={{ color: 'var(--color-primary-darker)', marginRight: '8px' }}>
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  {log.message}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Status indicator */}
          {(isProcessing || isSigning) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem',
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid var(--color-primary-darkest)',
                borderTop: '2px solid var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 'calc(var(--font-size-base) * 0.85)',
                color: 'var(--color-primary)',
              }}>
                {isSigning ? 'Signing transaction... please confirm in your wallet' : 'Processing... please wait'}
              </span>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              fontSize: 'var(--font-size-base)',
              color: '#ff4444',
              padding: '0.75rem',
              border: '1px solid #ff4444',
              background: 'rgba(255, 68, 68, 0.1)',
            }}>
              {error}
            </div>
          )}

          {/* Transaction Result */}
          {txResult && txResult.success && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(0, 255, 0, 0.1)',
              border: '1px solid #00ff00',
              color: '#00ff00',
            }}>
              <div style={{ fontWeight: 'bold' }}>Transaction Broadcast!</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                TX ID: {txResult.txId}
              </div>
            </div>
          )}

        </>
      )}

      {/* HiveAuth Message */}
      {showHiveAuthMessage && (
        <div style={{
          fontSize: 'var(--font-size-base)',
          color: '#ff4444',
          textAlign: 'center',
          marginTop: '0.5rem',
          letterSpacing: '0.05em'
        }}>
          Please accept the transaction in HiveAuth
        </div>
      )}
    </div>
  )
}
