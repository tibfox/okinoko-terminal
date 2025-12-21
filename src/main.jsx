import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import './index.css'
import { App } from './app.jsx'

import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/animations.css'
import { createClient, Provider, cacheExchange, fetchExchange, subscriptionExchange, makeOperation } from '@urql/preact';
import { pipe, map, mergeMap, fromPromise, fromValue } from 'wonka';
import { createClient as createWSClient } from 'graphql-ws';
import { print } from 'graphql';
import { HASURA_HTTP, HASURA_WS } from './lib/graphqlEndpoints.js'

// Guard against browsers where adoptedStyleSheets is unsupported or not array-like (e.g., missing Array methods)
if (typeof document !== 'undefined') {
  const sheets = document.adoptedStyleSheets
  if (sheets && typeof sheets.filter !== 'function') {
    // Lightweight polyfill so code using filter/push does not break; operates on a shallow copy
    sheets.filter = (...args) => Array.prototype.filter.apply(Array.from(sheets), args)
    sheets.push = (...args) => Array.prototype.push.apply(sheets, args)
  }
}

// Suppress AbortError console logs from urql/GraphQL operations
if (typeof window !== 'undefined') {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;

    // Check for abort-related errors in various forms
    const isAbortError =
      (reason && reason.name === 'AbortError') ||
      (reason && reason.code === 20) || // DOMException.ABORT_ERR
      (reason && reason.message && reason.message.includes('aborted'));

    if (isAbortError) {
      console.log('[Suppressed] Abort error caught and suppressed');
      event.preventDefault();
      return false;
    }
  });

  // Also filter console.error to suppress abort errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check if any argument contains abort-related errors
    const shouldSuppress = args.some(arg => {
      if (arg && typeof arg === 'object') {
        return arg.name === 'AbortError' ||
               arg.code === 20 || // DOMException.ABORT_ERR
               (arg.message && arg.message.includes('aborted'));
      }
      if (typeof arg === 'string') {
        return arg.includes('aborted');
      }
      return false;
    });

    if (!shouldSuppress) {
      originalConsoleError.apply(console, args);
    }
  };
}

import { TransactionProvider } from './transactions/provider';
import { PopupProvider } from "./popup/PopupProvider.jsx";
import { TerminalWindowProvider } from './components/terminal/providers/TerminalWindowProvider.jsx';
import { BackgroundEffectsProvider } from './components/backgrounds/BackgroundEffectsProvider.jsx';
import { MaintenanceOverlay } from './components/MaintenanceOverlay.jsx';
import {
  MAINTENANCE_MODE,
  MAINTENANCE_MESSAGE,
  BLOCKISSUE_AUTOMATIC_MODE,
  BLOCKISSUE_MESSAGE,
  BLOCKISSUE_FORCE_STALE,
} from './lib/maintenanceConfig.js';

const BLOCKS_API_BASE_URL = import.meta.env.VITE_BLOCKS_BACKEND
const BLOCK_ISSUE_THRESHOLD_MS = 15 * 60 * 1000
const BLOCK_ISSUE_POLL_INTERVAL_MS = 15000

const parseNumeric = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const extractLastBlockHeight = (propsData) => {
  if (!propsData || typeof propsData !== 'object') {
    return null
  }
  const candidates = [
    propsData.l2_block_height,
    propsData.l2BlockHeight,
    propsData.last_irreversible_block_num,
    propsData.last_block_id,
  ]
  for (const candidate of candidates) {
    const parsed = parseNumeric(candidate)
    if (parsed != null) {
      return parsed
    }
  }
  return null
}

const parseBlockTimestamp = (value) => {
  if (!value) {
    return null
  }
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string') {
    const isoValue = value.endsWith('Z') ? value : `${value}Z`
    const date = new Date(isoValue)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const getLatestBlockTimestamp = async () => {
  if (!BLOCKS_API_BASE_URL) {
    return null
  }
  const propsResponse = await fetch(`${BLOCKS_API_BASE_URL}/props`)
  if (!propsResponse.ok) {
    throw new Error(`Props request failed with ${propsResponse.status}`)
  }
  const propsData = await propsResponse.json()
  const height = extractLastBlockHeight(propsData)
  if (!Number.isFinite(height)) {
    throw new Error('Unable to determine latest L2 block height')
  }

  const params = new URLSearchParams({
    last_block_id: String(height),
    count: '1',
  })
  const blocksResponse = await fetch(`${BLOCKS_API_BASE_URL}/blocks?${params.toString()}`)
  if (!blocksResponse.ok) {
    throw new Error(`Blocks request failed with ${blocksResponse.status}`)
  }
  const payload = await blocksResponse.json()
  const rows = Array.isArray(payload) ? payload : []
  if (!rows.length) {
    return null
  }
  const latest = rows.reduce((acc, row) => {
    const currentId = parseNumeric(row?.be_info?.block_id)
    if (!acc) {
      return row
    }
    const accId = parseNumeric(acc?.be_info?.block_id)
    if (currentId == null || accId == null) {
      return acc
    }
    return currentId > accId ? row : acc
  }, null)
  const tsValue = latest?.be_info?.ts ?? latest?.ts
  return parseBlockTimestamp(tsValue)
}

const BlockIssueOverlay = () => {
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    if (!BLOCKISSUE_AUTOMATIC_MODE || !BLOCKS_API_BASE_URL) {
      setIsStale(false)
      return
    }
    let cancelled = false
    const checkBlocks = async () => {
      try {
        if (BLOCKISSUE_FORCE_STALE) {
          if (!cancelled) {
            setIsStale(true)
          }
          return
        }
        const latestTimestamp = await getLatestBlockTimestamp()
        if (!latestTimestamp) {
          if (!cancelled) {
            setIsStale(false)
          }
          return
        }
        const ageMs = Date.now() - latestTimestamp.getTime()
        const stale = ageMs >= BLOCK_ISSUE_THRESHOLD_MS
        if (!cancelled) {
          setIsStale(stale)
        }
      } catch {
        if (!cancelled) {
          setIsStale(false)
        }
      }
    }

    checkBlocks()
    const id = setInterval(checkBlocks, BLOCK_ISSUE_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!BLOCKISSUE_AUTOMATIC_MODE || !isStale) {
    return null
  }

  return <MaintenanceOverlay message={BLOCKISSUE_MESSAGE} />
}


const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetryConnection = (eventOrErr) => {
  if (!eventOrErr) return true;
  if (typeof eventOrErr === 'object' && 'code' in eventOrErr) {
    const code = eventOrErr.code;
    if (typeof code === 'number' && code >= 4400 && code < 4500) {
      return false;
    }
  }
  return true;
};

const createWsClientInstance = () => {
  const client = createWSClient({
    url: HASURA_WS,
    connectionParams: {
      headers: {
        'x-hasura-role': 'public',
      },
    },
    lazy: false,
    retryAttempts: Infinity,
    shouldRetry: shouldRetryConnection,
    retryWait: async (attempt) => {
      const cappedAttempt = Math.min(attempt, 5);
      const backoff = 1000 * 2 ** cappedAttempt;
      const jitter = Math.random() * 300;
      await wait(Math.min(backoff + jitter, 10000));
    },
    on: {
      connected: () => console.log('[WebSocket] Connected to Hasura'),
      connecting: () => console.log('[WebSocket] Connecting to Hasura...'),
      closed: (event) => console.log('[WebSocket] Connection closed:', event),
      error: (error) => console.error('[WebSocket] Error:', error),
    },
  });
  return client;
};

const wsClient = typeof window !== 'undefined' ? createWsClientInstance() : null;

// Custom fetch exchange that suppresses abort errors
const customFetchExchange = ({ forward }) => ops$ => {
  return pipe(
    ops$,
    mergeMap(operation => {
      const { url, fetchOptions } = operation.context;
      const body = JSON.stringify({
        query: typeof operation.query === 'string' ? operation.query : print(operation.query),
        variables: operation.variables,
      });

      return pipe(
        fromPromise(
          fetch(url || HASURA_HTTP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-hasura-role': 'public' },
            body,
            ...fetchOptions,
          })
            .then(response => response.json())
            .then(result => ({
              operation,
              data: result.data,
              error: result.errors ? new Error(result.errors[0].message) : undefined,
            }))
            .catch(error => {
              // Silently handle abort errors
              if (error.name === 'AbortError' || error.code === 20 || (error.message && error.message.includes('aborted'))) {
                return { operation, data: undefined, error: undefined };
              }
              return { operation, data: undefined, error };
            })
        ),
        map(result => result)
      );
    })
  );
};

const client = createClient({
  url: HASURA_HTTP,
  exchanges: [
    cacheExchange,
    subscriptionExchange({
      forwardSubscription(operation) {
        return {
          subscribe: (sink) => {
            if (!wsClient) {
              console.error('[SubscriptionExchange] No WebSocket client available');
              return { unsubscribe: () => {} };
            }
            const dispose = wsClient.subscribe(operation, {
              next: (data) => {
                sink.next(data);
              },
              error: (error) => {
                console.error('[SubscriptionExchange] Error for', operation.key, ':', error);
                sink.error(error);
              },
              complete: () => {
                sink.complete();
              },
            });
            return { unsubscribe: dispose };
          },
        };
      },
    }),
    customFetchExchange,
  ],
  fetchOptions: () => ({
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-role': 'public'
    },
  }),
  preferGetMethod: false, 
});


render(
  <BackgroundEffectsProvider>
    {MAINTENANCE_MODE ? (
      <MaintenanceOverlay message={MAINTENANCE_MESSAGE} />
    ) : (
      <BlockIssueOverlay />
    )}
    <TerminalWindowProvider>
      <Provider value={client}>
        <TransactionProvider>
          <PopupProvider>
            <App />
          </PopupProvider>
        </TransactionProvider>
      </Provider>
    </TerminalWindowProvider>
  </BackgroundEffectsProvider>,
  document.getElementById('app'),
)
