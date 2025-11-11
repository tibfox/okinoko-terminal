// src/components/ui/Menu.jsx
import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";

export default function Menu({
  trigger,
  children,
  title,
  closeOnOutsideClick = true,
  style = {},
  menuStyle = {},
  onToggle,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!closeOnOutsideClick) return;

    const handleClick = (e) => {
      if (!menuRef.current || !btnRef.current) return;

      if (
        !menuRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeOnOutsideClick]);

  // Measure height for smooth sliding
  const maxHeight = open
    ? `${menuRef.current?.scrollHeight + 10 || 0}px`
    : "0px";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        ref={btnRef}
        onClick={() =>
          setOpen((prev) => {
            const next = !prev
            onToggle?.(next)
            return next
          })
        }
      >
        {typeof trigger === "function" ? trigger(open) : trigger}
      </div>

      <div
        ref={menuRef}
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          overflow: "hidden",
          zIndex: 999,

          // sliding animation
          maxHeight,
          opacity: open ? 1 : 0,
          paddingTop: open ? "6px" : "0",
          transition:
            "max-height 0.25s ease, opacity 0.25s ease, padding 0.25s ease",

          ...style,
        }}
      >
        {/* HEADER CARD */}
        <div
          class="cyber-popup"
          style={{
            position: "relative",
            width: "100%",
            zIndex: 2,
            marginBottom: "0px",
            
          }}
        >
          <h5>{title}</h5>
        </div>
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
          <div style={{ padding: '8px', marginTop: '10px' }}>
            {/* If a render function is provided, call it each render */}
            {children}


            {/* use `tick` to appease VDOM diff optimizers (forces repaint) */}
            {/* <div style={{ display: "none" }}>{tick}</div> */}

          </div>
        </div>

        {/* <div class="cyber-tile"
          style={{
            background: "rgba(0,0,0,0.85)",
            padding: "10px",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            border: "1px solid rgba(255,255,255,0.25)",
            minWidth: "140px",
            ...menuStyle,
          }}
        >
          {children}
        </div> */}
      </div>
    </div>
  );
}
