import { useState } from "preact/hooks";
import BalanceDisplay from "../AccountDisplay.jsx";
import SlotText from "../../animations/SlotText.jsx";
import { useAioha } from "@aioha/react-ui";
import TxQueueIndicator from "../TxQueueIndicator.jsx";
import SettingsMenu from "../SettingsMenu.jsx";


export default function DesktopHeader({ title }) {
  const { user } = useAioha();
  const [menuOpen, setMenuOpen] = useState(false);

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
        <div style={{ flex: "0 1 auto", minWidth: 0, marginRight: "auto" }}>
          <SlotText
            text={title.toUpperCase().replace(/Ō/g, "ō")}
            tag="h1"
            interval={60}
            baseDuration={100}
            charDuration={30}
          />
        </div>

        {/* --- Burger Button --- */}


        {/* --- Middle: Account Data --- */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <TxQueueIndicator />
          <BalanceDisplay account={`hive:${user}`} fontMult={1} />
          <SettingsMenu />

        </div>
       
      </div>

    </div>
  );
}
