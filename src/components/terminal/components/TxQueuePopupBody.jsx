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
    faTrash
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

    // Show newest first (optional, remove reverse() if you prefer original order)
    const txs = state.queue.slice().reverse();

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
              fontSize: "0.9rem",
              fontWeight: "600",
              position: "sticky",
              top: 0,
              zIndex: 1,
              padding: "6px 0",
              background: "rgba(4, 15, 24, 0.95)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <span>{`Recent transactions (${txs.length})`}</span>
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={txs.length === 0}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "4px",
                padding: "4px 10px",
                background: "transparent",
                color: "inherit",
                opacity: txs.length === 0 ? 0.4 : 1,
                cursor: txs.length === 0 ? "not-allowed" : "pointer"
              }}
            >
               <FontAwesomeIcon
                      icon={faTrash}
                      style={{ marginRight: "6px" }}
                      title="Remove all"
                    /> all
            </button>
          </div>

          {txs.length === 0 && (
            <div style={{ fontStyle: "italic" }}>No recent transactions.</div>
          )}

          {txs.map((tx) => {
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
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                  title={tx.id}
                >
                  {tx.id.length > TRUNCATE
                    ? tx.id.slice(0, TRUNCATE) + "…"
                    : tx.id}
                </div>
                 {/* Copy button */}
                  <FontAwesomeIcon
                    icon={faCopy}
                    style={{ marginRight: "8px" }}
                    onClick={() => navigator.clipboard.writeText(tx.id)}
                    title="Copy transaction ID"
                  />

                  {/* External link */}
                  <FontAwesomeIcon
                    icon={faUpRightFromSquare}
                  
                    onClick={() =>
                      window.open(`https://vsc.techcoderx.com/tx/${tx.id}`, "_blank")
                    }
                    title="View on explorer"
                  />

                  <FontAwesomeIcon
                    icon={faTrash}
                    style={{ marginLeft: "auto", alignContent: "right" }}
                    title="Remove from list"
                    onClick={() => removeTransaction(tx.id)}
                  />
                </div>
             

              {/* Created / Status table (matches your table structure & labels) */}
              <table style={{ width: "100%", fontSize: "0.9rem" }}>
                <tbody>
                  <tr>
                    <td style={{ paddingRight: "8px" }}>Created:</td>
                    <td style={{ wordBreak: "break-all", textAlign: "left" }}>
                      {formatUTC(tx.startedAt)}
                    </td>
                  </tr>

                  <tr>
                    {/* You used `{tx.status}:` as the label; kept intact */}
                    <td style={{ paddingRight: "8px" }}>{tx.status}:</td>
                    <td
                      style={{
                        wordBreak: "break-all",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        textAlign: "left"
                      }}
                    >
                      {tx.status === "pending"
                        ? `${seconds}s`
                        : `${formatUTC(tx.completedAt)}`}

                      <FontAwesomeIcon icon={stateIcon[tx.status]} />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Action (left) + Toggle (right) with chevrons (your alignment kept) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
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
                    style={{ fontSize: "0.75rem" }}
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
                    fontSize: "11px",
                    overflowX: "auto",
                    borderRadius: "4px",
                    color: "var(--color-primary-lighter)",
                  }}
                >
                  <table>
                    <tbody>
                      <tr><td><strong></strong>Payload:</td>
                        <td>{JSON.stringify(tx.payload, null, 2)}</td>
                      </tr>
                      <tr><td><strong>Return:</strong></td>
                        <td>{JSON.stringify(tx.result, null, 2)}</td>
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
