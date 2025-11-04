// src/components/TxQueuePopupBody.jsx
import { useContext, useEffect, useState } from "preact/hooks";
import { TransactionContext } from "../../transactions/context.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHourglassHalf,
  faCircleCheck,
  faCircleXmark,
  faCopy,
  faUpRightFromSquare,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";

export default function TxQueuePopupBody() {
  const { state } = useContext(TransactionContext);

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
  const TRUNCATE = 25;

  return (
    <div
      style={{
        maxHeight: "60vh",
        overflowY: "auto",
        marginTop: "10px",
        color: "var(--color-primary)",
      }}
    >
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  wordBreak: "break-all",
                  fontSize: "1rem",
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
                style={{ cursor: "pointer", fontSize: "0.85rem", opacity: 0.8 }}
                onClick={() => navigator.clipboard.writeText(tx.id)}
                title="Copy transaction ID"
              />

              {/* External link */}
              <FontAwesomeIcon
                icon={faUpRightFromSquare}
                style={{ cursor: "pointer", fontSize: "0.85rem", opacity: 0.8 }}
                onClick={() =>
                  window.open(`https://vsc.techcoderx.com/tx/${tx.id}`, "_blank")
                }
                title="View on explorer"
              />
            </div>

            {/* Created / Status table (matches your table structure & labels) */}
            <table style={{ width: "100%", fontSize: "0.75rem" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "8px" }}>Created:</td>
                  <td style={{ wordBreak: "break-all" }}>
                    {new Date(tx.startedAt).toLocaleString()}
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
                    }}
                  >
                    {tx.status === "pending"
                      ? `${seconds}s`
                      : `${new Date(tx.completedAt).toLocaleString()}`}

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
                {isExpanded ? "hide payload" : "show payload"}
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
                {JSON.stringify(tx.payload, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
