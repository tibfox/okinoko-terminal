import { useState, useEffect } from "preact/hooks";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { PopupContext } from "./context.js";
import { useDeviceBreakpoint } from '../hooks/useDeviceBreakpoint.js';

export function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const isMobile = useDeviceBreakpoint();

  const openPopup = ({ title, body }) => {
    setPopup({
      title,
      body,
      showCloseButton: true,
    })
    setPosition({ x: 0, y: 0 }); // Reset position when opening new popup
  }
  const closePopup = () => setPopup(null);
// 🔁 Re-render the overlay every second while a popup is open
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!popup) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [popup]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

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
              width: isMobile ? "90vw" : "min(95vw, 50vw)",
              maxHeight: isMobile ? "90vh" : "95vh",
              display: "flex",
              flexDirection: "column",
              transform: `translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
              margin: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                zIndex: 1,
                padding: "18px 20px 16px",
                background: "black",
                border: "1px solid var(--color-primary-darkest)",
                color: "var(--color-primary-lighter, #9be8ff)",
                borderRadius: "12px",
                boxShadow: "0 0 18px rgba(0, 0, 0, 0.6)",
              }}
            >
              <div
                onMouseDown={handleMouseDown}
                style={{
                  marginBottom: "18px",
                  color: "var(--color-primary-lightest)",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: "0.85rem",
                  cursor: isDragging ? "grabbing" : "grab",
                  userSelect: "none",
                }}
              >
                {popup.title}
              </div>

              <div style={{ maxHeight: "60vh", overflowY: "auto", lineHeight: 1.5 }}>
                {typeof popup.body === "function" ? popup.body() : popup.body}
                <div style={{ display: "none" }}>{tick}</div>
              </div>

              <button
                onClick={closePopup}
                aria-label="Close popup"
                className="popup-close-btn"
                style={{
                  marginTop: "20px",
                  width: "100%",
                  border: "1px solid var(--color-primary-darkest)",
                  background: "transparent",
                  color: "var(--color-primary-lighter)",
                  fontFamily: "'Share Tech Mono', monospace",
                  letterSpacing: "0.2em",
                  padding: "10px",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}
