import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'

import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/animations.css'
import { createClient, Provider, cacheExchange, fetchExchange, subscriptionExchange } from '@urql/preact';
import { createClient as createWSClient } from 'graphql-ws';
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

import { TransactionProvider } from './transactions/provider';
import { PopupProvider } from "./popup/PopupProvider.jsx";
import { TerminalWindowProvider } from './components/terminal/providers/TerminalWindowProvider.jsx';
import { BackgroundEffectsProvider } from './components/backgrounds/BackgroundEffectsProvider.jsx';


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

const createWsClientInstance = () =>
  createWSClient({
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
  });

const wsClient = typeof window !== 'undefined' ? createWsClientInstance() : null;

const client = createClient({
  url: HASURA_HTTP,
  exchanges: [
    cacheExchange,
    fetchExchange,
    subscriptionExchange({
      forwardSubscription(operation) {
        return {
          subscribe: (sink) => {
            if (!wsClient) {
              return { unsubscribe: () => {} };
            }
            const dispose = wsClient.subscribe(operation, sink);
            return { unsubscribe: dispose };
          },
        };
      },
    }),
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
