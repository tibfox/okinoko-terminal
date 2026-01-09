  // src/components/TxQueuePopupBody.jsx
  import { useContext, useEffect, useState } from "preact/hooks";
  import { TransactionContext } from "../../../transactions/context.js";
  import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
  import {
    faHourglassHalf,
    faCircleCheck,
    faCircleXmark,
    faCopy,
    faUpRightFromSquare,
    faChevronDown,
    faChevronUp,
    faTrash,
    faFilter
  } from "@fortawesome/free-solid-svg-icons";
import { formatUTC } from "../../../lib/friendlyDates.js";

  export default function TxQueuePopupBody() {
    const { state, removeTransaction, clearTransactions } = useContext(TransactionContext);

    // Live tick so "Waiting Ns" updates
    const [tick, setTick] = useState(Date.now());
    useEffect(() => {
      const id = setInterval(() => setTick(Date.now()), 1000);
      return () => clearInterval(id);
    }, []);

    // Your icon mapping (unchanged)
    const stateIcon = {
      pending: faHourglassHalf,
      success: faCircleCheck,
      error: faCircleXmark,
    };

    // Per-tx payload expansion state (by id)
    const [expanded, setExpanded] = useState({});
    const togglePayload = (id) =>
      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const [activeTab, setActiveTab] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    // Show newest first (optional, remove reverse() if you prefer original order)
    const txs = state.queue.slice().reverse();
    const pendingTxs = txs.filter((tx) => tx.status === "pending");
    const successTxs = txs.filter((tx) => tx.status === "success");
    const errorTxs = txs.filter((tx) => tx.status === "error");
    const visibleTxs =
      activeTab === "pending"
        ? pendingTxs
        : activeTab === "executed"
          ? successTxs
          : activeTab === "failed"
            ? errorTxs
            : txs;

    // Keep your current truncation behavior (25 chars as in your snippet)
    const TRUNCATE = 18;

    const handleDeleteAll = () => {
      if (txs.length === 0) return;
      const confirmed = window.confirm(
        `Delete all ${txs.length} recent transaction${txs.length === 1 ? "" : "s"}?`
      );
      if (confirmed) {
        clearTransactions();
      }
    };

    const parseResultPayload = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    const extractErrorMessage = (value) => {
      const payload = parseResultPayload(value);
      if (!payload) return "";
      if (typeof payload === "string") return payload;
      if (payload.error || payload.err || payload.message || payload.reason) {
        return payload.error || payload.err || payload.message || payload.reason;
      }
      if (payload.ret) {
        const nested = parseResultPayload(payload.ret);
        if (typeof nested === "string") return nested;
        if (nested && (nested.error || nested.err || nested.message || nested.reason)) {
          return nested.error || nested.err || nested.message || nested.reason;
        }
      }
      return "";
    };

    const formatResultDisplay = (tx) => {
      if (!tx) return "-";
      const raw = tx.result;
      if (raw === null || raw === undefined || raw === "") {
        return tx.status === "error" ? "-" : "-";
      }
      const errorMessage = tx.status === "error" ? extractErrorMessage(raw) : "";
      if (errorMessage) return errorMessage;
      const parsed = parseResultPayload(raw);
      if (typeof parsed === "string") return parsed;
      return JSON.stringify(parsed, null, 2);
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          marginTop: "10px",
          color: "var(--color-primary-lighter)",
        }}
      >
        <div
          className="neon-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
              fontSize: "var(--font-size-base)",
              fontWeight: "600",
              // position: "sticky",
              top: 0,
              zIndex: 1,
              padding: "6px 0",
              background: 'transparent',
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {txs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    padding: "2px 6px",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: "var(--font-size-base)",
                    fontFamily: "var(--font-family-base)",
                  }}
                  title="Toggle filters"
                  aria-label="Toggle filters"
                >
                  <FontAwesomeIcon icon={faFilter} style={{ fontSize: '0.9rem' }} />
                </button>
              )}
              {`TXs (${txs.length})`}
            </span>
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={txs.length === 0}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontFamily: "var(--font-family-base)",
                fontSize: "var(--font-size-base)",
                padding: "4px 10px",
                background: "transparent",
                color: "inherit",
                opacity: txs.length === 0 ? 0.4 : 1,
                cursor: txs.length === 0 ? "not-allowed" : "pointer"
              }}
            >
               <FontAwesomeIcon
                      icon={faTrash}
                      style={{ fontSize: '0.9rem' ,marginRight: "6px" }}
                      
                      title="Remove all"
                    /> all
            </button>
          </div>

          {txs.length === 0 && (
            <div style={{ fontStyle: "italic" }}>No recent transactions.</div>
          )}

          {txs.length > 0 && showFilters && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "4px 10px",
                  background: activeTab === "all" ? "var(--color-primary-darker)" : "transparent",
                  color: activeTab === "all" ? "black" : "inherit",
                  fontSize: "var(--font-size-base)",
                  fontFamily: "var(--font-family-base)",
                  cursor: "pointer",
                }}
              >
                {`all (${txs.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "4px 10px",
                  background: activeTab === "pending" ? "var(--color-primary-darker)" : "transparent",
                  color: activeTab === "pending" ? "black" : "inherit",
                  fontSize: "var(--font-size-base)",
                  fontFamily: "var(--font-family-base)",
                  cursor: "pointer",
                }}
              >
                {`pending (${pendingTxs.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("executed")}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "4px 10px",
                  background: activeTab === "executed" ? "var(--color-primary-darker)" : "transparent",
                  color: activeTab === "executed" ? "black" : "inherit",
                  fontSize: "var(--font-size-base)",
                  fontFamily: "var(--font-family-base)",
                  cursor: "pointer",
                }}
              >
                {`executed (${successTxs.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("failed")}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "4px 10px",
                  background: activeTab === "failed" ? "var(--color-primary-darker)" : "transparent",
                  color: activeTab === "failed" ? "black" : "inherit",
                  fontSize: "var(--font-size-base)",
                  fontFamily: "var(--font-family-base)",
                  cursor: "pointer",
                }}
              >
                {`failed (${errorTxs.length})`}
              </button>
            </div>
          )}

          {visibleTxs.map((tx) => {
          // Use completedAt when available to freeze the duration
          const seconds = Math.floor(
            ((tx.completedAt ?? Date.now()) - tx.startedAt) / 1000
          );
          const isExpanded = !!expanded[tx.id];

          return (
            <div
              key={tx.id}
              style={{ padding: "10px 0", borderBottom: "1px solid #333" }}
            >
              {/* TX ID + copy + external link (keeps your styling) */}
              <div style={{ display: "flex", alignItems: "center",justifyItems:'stretch', gap: "10px" }}>
                <div
                  style={{
                    wordBreak: "break-all",
                    fontSize: "var(--font-size-base)",
                    fontWeight: "bold",
                  }}
                  title={tx.id}
                >
                  <FontAwesomeIcon icon={stateIcon[tx.status]} style={{ fontSize: '0.9rem' }} />
                  <span>
                    {tx.id.length > TRUNCATE
                      ? tx.id.slice(0, TRUNCATE) + "…"
                      : tx.id}
                  </span>
                  <span style={{ opacity: 0.8, marginLeft: "6px" }}>
                    {tx.status === "pending"
                      ? `${seconds}s`
                      : formatUTC(new Date(tx.completedAt).toISOString())}
                  </span>
                </div>
                 {/* Copy button */}
                  <FontAwesomeIcon
                    icon={faCopy}
                    style={{ fontSize: '0.9rem',marginRight: "8px" }}
                    
                    onClick={() => navigator.clipboard.writeText(tx.id)}
                    title="Copy transaction ID"
                  />

                  {/* External link */}
                  <FontAwesomeIcon
                    icon={faUpRightFromSquare}
                  style={{ fontSize: '0.9rem' }} 
                    onClick={() =>
                      window.open(`https://vsc.techcoderx.com/tx/${tx.id}`, "_blank")
                    }
                    title="View on explorer"
                  />

                  <FontAwesomeIcon
                    icon={faTrash}
                    style={{ fontSize: '0.9rem',marginLeft: "auto", alignContent: "right" }}
                  
                    title="Remove from list"
                    onClick={() => removeTransaction(tx.id)}
                  />
                </div>
             

              {/* Action (left) + Toggle (right) with chevrons (your alignment kept) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "6px",
                  cursor: "pointer",
                  fontSize: "var(--font-size-base)",
                  // color: "var(--color-primary)",
                }}
                onClick={() => togglePayload(tx.id)}
              >
                <span style={{ fontWeight: "600", opacity: 0.85, color: "inherit" }}>
                  {tx.action}
                </span>

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isExpanded ? "hide details" : "show details"}
                  <FontAwesomeIcon
                    icon={isExpanded ? faChevronUp : faChevronDown}
                      style={{ fontSize: '0.9rem' }} 
                  />
                </span>
              </div>

              {/* Payload (expanded) */}
              {isExpanded && (
                <pre
                  style={{
                    marginTop: "6px",
                    background: "rgba(255,255,255,0.05)",
                    padding: "6px",
                    fontSize: "var(--font-size-base)",
                    fontFamily: "var(--font-family-base)",
                    overflowX: "auto",

                    color: "var(--color-primary-lighter)",
                  }}
                >
                  <table>
                    <tbody>
                      <tr><td><strong></strong>Payload:</td>
                        <td>{JSON.stringify(tx.payload, null, 2)}</td>
                      </tr>
                      <tr><td><strong>Return:</strong></td>
                        <td>{formatResultDisplay(tx)}</td>
                      </tr>
                    </tbody>

                  </table>

                </pre>
              )}
            </div>
          );
          })}
        </div>
      </div>
    );
  }
