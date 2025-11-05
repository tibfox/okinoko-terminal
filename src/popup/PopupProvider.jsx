import { useState, useEffect } from "preact/hooks";
import { PopupContext } from "./context.js";

export function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null);

  const openPopup = ({ title, body }) => setPopup({ title, body });
  const closePopup = () => setPopup(null);
// 🔁 Re-render the overlay every second while a popup is open
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!popup) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [popup]);

  return (
    <PopupContext.Provider value={{ openPopup, closePopup }}>
      {children}

      {popup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            zIndex: 999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
          onClick={closePopup}
        >
          <div
            style={{
              position: "relative",
              width: "340px",
              height: "50vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER CARD */}
            <div
              class="cyber-popup"
              style={{
                position: "relative",
                width: "100%",
                zIndex: 2,
                marginBottom: "-20px",
                padding: "14px",
              }}
            >
              <h5>{popup.title}</h5>
            </div>

            {/* BACK PANEL */}
            <div
              // class="cyber-popup"
               style={{
        flex: 1,
        position: "relative",
        width: "100%",
        zIndex: 1,
        padding: "14px",
        background: "black",
        border: "1px solid var(--color-primary-darkest)",
      }}
            >
                <div style={{padding: '8px',marginTop:'10px'}}>
              {/* If a render function is provided, call it each render */}
              {typeof popup.body === "function" ? popup.body() : popup.body}

              {/* use `tick` to appease VDOM diff optimizers (forces repaint) */}
              <div style={{ display: "none" }}>{tick}</div>

              </div>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}
