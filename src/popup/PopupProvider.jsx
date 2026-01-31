import { useState, useEffect, useCallback, useMemo, useRef } from "preact/hooks";
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
  const popupRef = useRef(null);

  // Keep a ref to the current popup for closePopup to access without re-creating the callback
  popupRef.current = popup;

  const openPopup = useCallback(({ title, body, width, onClose, confirmClose }) => {
    setPopup({
      title,
      body,
      width,
      showCloseButton: true,
      onClose,
      confirmClose, // Function that returns true if close should be confirmed, or a string message
    })
    setPosition({ x: 0, y: 0 }); // Reset position when opening new popup
  }, [])

  const closePopup = useCallback(() => {
    const currentPopup = popupRef.current
    // Check if we need to confirm before closing
    if (currentPopup?.confirmClose) {
      const confirmResult = currentPopup.confirmClose()
      if (confirmResult) {
        const message = typeof confirmResult === 'string'
          ? confirmResult
          : 'Are you sure you want to close? The current operation is still in progress.'
        if (!window.confirm(message)) {
          return // Don't close if user cancels
        }
      }
    }
    // Call the onClose callback if provided
    currentPopup?.onClose?.()
    setPopup(null)
  }, []);
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

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({ openPopup, closePopup }), [openPopup, closePopup]);

  return (
    <PopupContext.Provider value={contextValue}>
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
              width: isMobile ? "90vw" : (popup.width || "min(95vw, 50vw)"),
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
                  fontSize: "var(--font-size-base)",
                  cursor: isDragging ? "grabbing" : "grab",
                  userSelect: "none",
                }}
              >
                {popup.title}
              </div>

              <div className="neon-scroll" style={{ maxHeight: "60vh", overflowY: "auto", lineHeight: 1.5 }}>
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
                  fontFamily: 'var(--font-family-base)',
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
