import BalanceDisplay from "../components/AccountDisplay.jsx";
import SlotText from "../../animations/SlotText.jsx";
import { useAioha } from "@aioha/react-ui";
import SettingsMenu from "../components/SettingsMenu.jsx";
import { useResponsiveTitleSize } from "../../../hooks/useResponsiveTitleSize.js";

export default function DesktopHeader({
  title,
  titleOnMinimize,
  onDragPointerDown,
  isMinimized = false,
}) {
  const { user } = useAioha();
  const displayTitle = (isMinimized ? titleOnMinimize : title)
    .toUpperCase()
    .replace(/Ō/g, "ō");
  const { wrapperRef, fontSize, isClamped } = useResponsiveTitleSize({
    text: displayTitle,
  });

  const showGlyphFallback = isMinimized && isClamped;

  const handleDragPointerDown = (event) => {
    onDragPointerDown?.(event);
  };

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
            fontSize: `${fontSize}px`,
            lineHeight: 1.05,
          }}
          onPointerDown={handleDragPointerDown}
          ref={wrapperRef}
        >
          {isMinimized && !showGlyphFallback ? (
            <h1
              className="cyber-tile"
              style={{
                margin: 0,
                fontFamily: "'Share Tech Mono',monospace",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
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
                display: "block",
                lineHeight: 1.05,
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
            {/* <BalanceDisplay account={`hive:${user}`} fontMult={1} />
            <SettingsMenu /> */}
          </div>
        )}
      </div>
    </div>
  );
}
