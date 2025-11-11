import BalanceDisplay from "../AccountDisplay.jsx";
import SlotText from "../../animations/SlotText.jsx";
import { useAioha } from "@aioha/react-ui";
import TxQueueIndicator from "../TxQueueIndicator.jsx";
import SettingsMenu from "../SettingsMenu.jsx";

export default function DesktopHeader({
  title,
  onDragPointerDown,
  isMinimized = false,
}) {
  const { user } = useAioha();

  const handleDragPointerDown = (event) => {
    onDragPointerDown?.(event);
  };

  const displayTitle = (isMinimized ? "Terminal" : title)
    .toUpperCase()
    .replace(/Ō/g, "ō");

  return (
    <div style={{ position: "relative", marginBottom: "40px" }}>
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
            flex: "0 1 auto",
            minWidth: 0,
            maxWidth: "100%",
            marginRight: "auto",
            cursor: "grab",
            overflow: "hidden",
          }}
          onPointerDown={handleDragPointerDown}
        >
          {isMinimized ? (
            <h1
              className="cyber-tile"
              style={{
                margin: 0,
                lineHeight: 1.05,
                fontFamily: "'Share Tech Mono',monospace",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                fontSize: "1.1rem",
                letterSpacing: "0.15em",
                display: "block",
              }}
            >
              {displayTitle}
            </h1>
          ) : (
            <SlotText
              text={displayTitle}
              tag="h1"
              interval={60}
              baseDuration={100}
              charDuration={30}
              pad={false}
              style={{
                lineHeight: 1.05,
                display: "block",
              }}
            />
          )}
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
            <TxQueueIndicator isMobile="false" />
            <BalanceDisplay account={`hive:${user}`} fontMult={1} />
            <SettingsMenu />
          </div>
        )}
      </div>
    </div>
  );
}
