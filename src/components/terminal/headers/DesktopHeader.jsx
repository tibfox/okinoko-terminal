import { h } from "preact";
import BalanceDisplay from "../AccountDisplay.jsx";
import SlotText from "../../animations/SlotText.jsx";
import ColorPickerButton from "./ColorPickerButton.jsx";
import SoundToggleButton from "../SoundToggleButton.jsx";
import { useAioha } from "@aioha/react-ui";

export default function DesktopHeader({ title }) {
  const { user } = useAioha();

  return (
    <div
      style={{
        position: "relative", // anchor for absolute positioning
        marginBottom: "40px",
      }}
    >
      {/* === Header row === */}
      <div
        style={{
          display: "flex",
          alignItems: "center", // centers title + balance
          justifyContent: "flex-start",
          flexWrap: "nowrap",
          gap: "0.75rem",
        }}
      >
        {/* --- Left: Title + Color Row --- */}
        <div style={{ flex: "0 1 auto", minWidth: 0, marginRight: "auto" }}>
          <SlotText
            text={title.toUpperCase()}
            tag="h1"
            interval={60}
            baseDuration={100}
            charDuration={30}
          />
          <ColorPickerButton isMobile="false"/>
        </div>

        {/* --- Middle: Account Data --- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BalanceDisplay account={`hive:${user}`} fontMult={1} />
        </div>
      </div>

      {/* === Sound button below header, right aligned === */}
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)", // just below the header
          right: 10, // align to right edge
        }}
      >
        <SoundToggleButton />
      </div>
    </div>
  );
}
