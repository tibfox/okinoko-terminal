import { useState } from "preact/hooks";
import { useAioha } from "@aioha/providers/react";
import { KeyTypes } from "@aioha/aioha";
import SlotText from "../../animations/SlotText.jsx";
import { createMultiAuthTransfer } from "../../../lib/multiAuthTransaction.js";

const TEST_USERNAME = import.meta.env.VITE_TEST_HIVE_USERNAME;
const TEST_ACTIVE_KEY = import.meta.env.VITE_TEST_HIVE_ACTIVE_KEY;

export default function DesktopHeader({
  title,
  titleOnMinimize,
  onDragPointerDown,
  isMinimized = false,
}) {
  const { aioha, user } = useAioha();
  const [isProcessing, setIsProcessing] = useState(false);

  const displayTitle = (isMinimized ? titleOnMinimize : title)
    .toUpperCase()
    .replace(/Ō/g, "ō");

  const tileColors = {
    color: "#000",
    background: "var(--color-primary-darker)",
  };

  const handleDragPointerDown = (event) => {
    onDragPointerDown?.(event);
  };

  const handleTestClick = async () => {
    if (!user) {
      alert("Please connect your wallet first");
      return;
    }

    if (!TEST_USERNAME || !TEST_ACTIVE_KEY || TEST_USERNAME === "your_test_username") {
      alert("Please configure VITE_TEST_HIVE_USERNAME and VITE_TEST_HIVE_ACTIVE_KEY in your .env file");
      return;
    }

    const normalizedUser = user.startsWith("hive:") ? user.slice(5) : user;

    setIsProcessing(true);

    try {
      // Step 1: Create the transaction and sign with the first authority (env key)
      console.log("Creating multi-auth transfer transaction...");
      const { transaction } = await createMultiAuthTransfer({
        from: TEST_USERNAME, // The account configured for multi-auth
        to: "null", // Sending to null for test (burns tokens)
        amount: "0.001 HIVE",
        memo: `Multi-auth test from ${TEST_USERNAME} + ${normalizedUser}`,
        firstSignerUsername: TEST_USERNAME,
        firstSignerActiveKey: TEST_ACTIVE_KEY,
        secondSignerUsername: normalizedUser,
      });

      console.log("Transaction signed by first authority:", transaction);

      // Step 2: Ask aioha user to sign the transaction
      // Since aioha doesn't have a direct "sign existing transaction" method,
      // we need to use signAndBroadcastTx with the same operations
      // The transaction already has the first signature, so we pass it to aioha
      // to add the second signature and broadcast

      console.log("Requesting second signature from aioha user...");

      // For multi-sig, we need to use aioha's signTx method if available,
      // or we can broadcast the pre-signed transaction and ask user to sign same ops
      const result = await aioha.signAndBroadcastTx(
        transaction.operations,
        KeyTypes.Active
      );

      if (result?.success) {
        console.log("Transaction broadcast successful:", result);
        alert(`Multi-auth transaction successful!\nTx ID: ${result.result}`);
      } else {
        console.error("Transaction failed:", result?.error);
        alert(`Transaction failed: ${result?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error in multi-auth transaction:", error);
      alert(`Error: ${error.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        margin: 0,
        padding: "0 0 16px 0",
        boxSizing: "border-box",
      }}
    >
      {/* === Header Row === */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          flexWrap: "nowrap",
          gap: "0.75rem",
        }}
      >
        {/* --- Left: Title + Color Row --- */}
        <div
          style={{
            flex: "1 1 auto",
            marginRight: "auto",
            cursor: "grab",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
          onPointerDown={handleDragPointerDown}
        >
          {isMinimized ? (
            <h1
              className="cyber-tile cyber-tile-header"
              style={{
                margin: 0,
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-base)',
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                letterSpacing: "0.15em",
                display: "block",
                ...tileColors,
              }}
              title={displayTitle}
            >
              {displayTitle}
            </h1>
          ) : (
            <SlotText
              text={displayTitle}
              tag="h1"
              className="cyber-tile cyber-tile-header"
              interval={60}
              baseDuration={100}
              charDuration={30}
              pad={false}
              style={{
                display: "block",
                fontSize: 'var(--font-size-base)',
                ...tileColors,
              }}
            />
          )}
          <button
            className="cyber-tile"
            style={{
              padding: "0.25rem 0.75rem",
              fontSize: "var(--font-size-base)",
              fontFamily: "var(--font-family-base)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: isProcessing ? "wait" : "pointer",
              border: "none",
              background: "var(--color-primary-darker)",
              color: "#000",
              opacity: isProcessing ? 0.6 : 1,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleTestClick}
            disabled={isProcessing}
          >
            {isProcessing ? "..." : "Test"}
          </button>
        </div>

        {/* --- Middle: Account Data --- */}
        {!isMinimized && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {/* <BalanceDisplay account={`hive:${user}`} fontMult={1} />
            <SettingsMenu /> */}
          </div>
        )}
      </div>
    </div>
  );
}
