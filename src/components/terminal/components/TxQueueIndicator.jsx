import { h } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { TransactionContext } from "../../../transactions/context.js";
import TxQueuePopupBody from "./TxQueuePopupBody.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import Menu from "../../buttons/MenuButton.jsx";

export default function TxQueueIndicator({ isMobile }) {
  const { state } = useContext(TransactionContext);

  const pending = state.queue.filter((tx) => tx.status === "pending");
  const completed = state.queue.filter((tx) => tx.status !== "pending");

  const pendingCount = pending.length;
  const completedCount = completed.length;

  // force re-render so pending timers tick
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <Menu
    title="Recent Transactions"
      closeOnOutsideClick={true}
      style={{ minWidth: "330px", right: isMobile === "true" ? "-110px" : "0" }}
      menuStyle={{
        background: "rgba(0,0,0,0.85)",
        padding: "12px",
        color: "var(--color-primary)"
      }}
      trigger={
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
            fontSize: "22px",
          }}
        >
          <FontAwesomeIcon
            icon={faLayerGroup}
            style={{ color: "var(--color-primary-darker)", fontSize: "1.6rem" }}
          />

          {/* ✅ Completed left badge */}
          {/* {completedCount > 0 && (
            <span
              class="tx-badge"
              style={{ top: "-12px", left: "-10px" }}
              title="Completed"
            >
              {completedCount}
            </span>
          )} */}

          {/* ⏳ Pending right badge */}
          {pendingCount > 0 && (
            <span
              class="tx-badge pending-badge"
            style={{ top: "-12px", left: "-5px" }}
              title="Pending"
            >
              {pendingCount}
            </span>
          )}
        </div>
      }
    >
      <div class="neon-scroll" style={{ maxHeight: "300px", overflowY: "auto" }}>
        <TxQueuePopupBody />
      </div>
    </Menu>
  );
}
