// src/transactions/provider.jsx
import { useReducer, useEffect } from 'preact/hooks';
import { TransactionContext } from './context';
import { checkTxStatus } from '../lib/vscPollClient.js';

const STORAGE_KEY = "txQueue";

const initialState = { queue: [] };

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { queue: JSON.parse(saved) } : initialState;
  } catch (e) {
    console.warn("⚠️ Failed to load tx queue:", e);
    return initialState;
  }
}

function saveState(state) {
  try {
    // strip non-serializable fields (e.g. functions) before saving
    const serializable = state.queue.map(({ onStatus, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.warn("⚠️ Failed to save tx queue:", e);
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { ...state, queue: [...state.queue, action.tx] };
    case 'UPDATE':
      return {
        ...state,
        queue: state.queue.map(tx =>
          tx.id === action.id
            ? {
                ...tx,
                status: action.status,
                result: action.result,
                completedAt: action.completedAt ?? tx.completedAt
              }
            : tx
        )
      };
    case 'REMOVE':
      return { ...state, queue: state.queue.filter(tx => tx.id !== action.id) };
    default:
      return state;
  }
}

export function TransactionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, loadState);

  // persist to localStorage
  useEffect(() => saveState(state), [state]);

  // poll only pending txs
  useEffect(() => {
    const pendingTxs = state.queue.filter(tx => tx.status === "pending");
    if (pendingTxs.length === 0) return;

    const interval = setInterval(async () => {
      for (const tx of pendingTxs) {
        const { status, result } = await checkTxStatus(tx.id);
        if (status === "pending") continue;

        dispatch({
          type: "UPDATE",
          id: tx.id,
          status,
          result,
          completedAt: Date.now()
        });

        // notify component safely (prevents reload effects)
        if (typeof tx.onStatus === "function") {
          try {
            let reloadBlocked = false;
            const stopReload = () => {
              reloadBlocked = true;
              console.warn("⚠️ Blocked page reload call inside tx.onStatus");
            };

            const fakeWindow = new Proxy(window, {
              get(target, key) {
                if (key === "location") {
                  return new Proxy(target.location, {
                    get(loc, prop) {
                      return prop === "reload" ? stopReload : loc[prop];
                    }
                  });
                }
                return target[key];
              }
            });

            tx.onStatus.call(fakeWindow, status, result);
            if (reloadBlocked) {
              console.log("✅ Prevented dApp reload after TX completion");
            }
          } catch (err) {
            console.warn("TX onStatus callback error:", err);
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state.queue]);

  const addTransaction = (tx) => dispatch({ type: 'ADD', tx });
  const removeTransaction = (id) => dispatch({ type: 'REMOVE', id });

  return (
    <TransactionContext.Provider value={{ state, addTransaction, removeTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
}
