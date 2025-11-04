// src/transactions/provider.jsx
import { useReducer, useEffect } from 'preact/hooks';
import { TransactionContext } from './context';
import { checkTxStatus } from '../lib/vscPollClient.js';

const initialState = {
    queue: [] // { id, payload, status }
};

function reducer(state, action) {
    switch (action.type) {
        case 'ADD':
            return { ...state, queue: [...state.queue, action.tx] };
        case "UPDATE":
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
            return {
                ...state,
                queue: state.queue.filter(tx => tx.id !== action.id)
            };
        default:
            return state;
    }
}


export function TransactionProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        // only poll pending txs
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
                console.log("✅ TX done: preventing reload");
                if (typeof tx.onStatus === "function") {
                    try {
                        let reloadBlocked = false;

                        const stopReload = () => {
                            reloadBlocked = true;
                            console.warn("⚠️ Blocked page reload call inside tx.onStatus");
                        };

                        // Monkey patch only inside function scope (non-invasive)
                        const fakeWindow = new Proxy(window, {
                            get(target, key) {
                                if (key === "location") {
                                    return new Proxy(target.location, {
                                        get(loc, prop) {
                                            if (prop === "reload") return stopReload;
                                            return loc[prop];
                                        }
                                    });
                                }
                                return target[key];
                            }
                        });

                        // Call with fakeWindow context
                        tx.onStatus.call(fakeWindow, status, result);

                        if (reloadBlocked) {
                            // Optional: show toast that reload was prevented
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

    return (
        <TransactionContext.Provider value={{ state, addTransaction }}>
            {children}
        </TransactionContext.Provider>
    );
}
