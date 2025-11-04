import { useContext, useEffect, useState } from "preact/hooks";
import { TransactionContext } from "../../transactions/context.js";
import { PopupContext } from "../../popup/context.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import TxQueuePopupBody from "./TxQueuePopupBody.jsx";

export default function TxQueueIndicator() {
  const { state } = useContext(TransactionContext);
  const { openPopup, closePopup } = useContext(PopupContext);

  const pending = state.queue.filter((tx) => tx.status === "pending");
  const completed = state.queue.filter((tx) => tx.status !== "pending");

  const pendingCount = pending.length;
  const completedCount = completed.length;

  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const openTxPopup = () => {
    openPopup({
      title: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <strong>Transactions</strong>
          <button
            onClick={closePopup}
            style={{
              background: "transparent",
              color: "var(--color-primary)",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              marginRight: "8px"
            }}
          >
            ✕
          </button>
        </div>
      ),
      body: () => <TxQueuePopupBody />
    });
  };

  return (
  <div style={{ position: "relative" }}>
    <div
      onClick={openTxPopup}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        fontSize: "22px"
      }}
    >
      <FontAwesomeIcon
        icon={faLayerGroup}
        style={{ color: "var(--color-primary-darker)", fontSize: "1.6rem" }}
      />

      {/* ✅ Completed left badge */}
      {completedCount > 0 && (
        <span
        class="tx-badge" 
          style={{
            top: "-12px",
            left: "-10px",
          }}
          title="Completed"
        >
          {completedCount}
        </span>
      )}

      {/* ⏳ Pending right badge */}
      {pendingCount > 0 && (
       <span class="tx-badge pending-badge"
       style={{
          top: "-12px",
          right: "-9px",
      }}
        title="Pending"
       >
          {pendingCount}
        </span>
       )} 
    </div>
  </div>
);

}
