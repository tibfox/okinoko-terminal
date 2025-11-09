import { createClient, cacheExchange, fetchExchange, subscriptionExchange } from '@urql/preact';
// import { createClient as createWSClient } from 'graphql-ws';

const HASURA_HTTP = import.meta.env.VITE_HASURA_HTTP || 'https://vscapi.okinoko.io/hasura/v1/graphql';
const HASURA_WS   = import.meta.env.VITE_HASURA_WS   || 'wss://vscapi.okinoko.io/hasura/v1/graphql';

// // WebSocket client for subscriptions
// const ws = createWSClient({
//   url: HASURA_WS,
//   connectionParams: {
//     headers: { 'x-hasura-role': 'public' }, // adjust if you use auth
//   },
// });

export const urqlClient = createClient({
  url: HASURA_HTTP,
  exchanges: [
    cacheExchange,
    fetchExchange,
    // subscriptionExchange({
    //   forwardSubscription: op => ({
    //     subscribe: sink => {
    //       const dispose = ws.subscribe(op, sink);
    //       return { unsubscribe: dispose };
    //     },
    //   }),
    // }),
  ],
});

// Small helpers
export const gql = (literals, ...placeholders) =>
  literals.reduce((acc, lit, i) => acc + lit + (placeholders[i] ?? ''), '');

export const runQuery = (query, variables = {}) =>
  urqlClient.query(query, variables).toPromise();

export const runMutation = (mutation, variables = {}) =>
  urqlClient.mutation(mutation, variables).toPromise();

export const runSubscription = (query, variables = {}, onNext) => {
  const { unsubscribe } = urqlClient.subscription(query, variables).subscribe(result => {
    if (onNext) onNext(result);
  });
  return unsubscribe;
};
