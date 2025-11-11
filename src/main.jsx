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

import { TransactionProvider } from './transactions/provider';
import { PopupProvider } from "./popup/PopupProvider.jsx";
import { TerminalWindowProvider } from './components/terminal/providers/TerminalWindowProvider.jsx';


const wsClient = typeof window !== 'undefined'
  ? createWSClient({
      url: HASURA_WS,
      connectionParams: {
        headers: {
          'x-hasura-role': 'public',
        },
      },
    })
  : null;

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
  <TerminalWindowProvider>
    <Provider value={client}>
      <TransactionProvider>
        <PopupProvider>
          <App />
        </PopupProvider>
      </TransactionProvider>
    </Provider>
  </TerminalWindowProvider>,
  document.getElementById('app'),
)
