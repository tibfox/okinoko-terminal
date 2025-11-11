import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { magiAsciiArt } from "./art.js";

const artLines = magiAsciiArt.split("\n").filter(Boolean);
const artColumns = Math.max(...artLines.map((line) => line.length));
const artRows = artLines.length;
const ART_ASPECT = artColumns / artRows;

const MIN_FONT = 4;
const MAX_FONT_DESKTOP = 14;
const CHAR_WIDTH_RATIO = 0.65; // monospace approximation tuned for desktop scaling

export default function AsciiArt() {
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });
  const wrapperRef = useRef(null);

  // // Efficient mobile detection
  // useEffect(() => {
  //   const mq = window.matchMedia("(max-width: 900px)");

  //   const handler = (e) => setIsMobile(e.matches);
  //   setIsMobile(mq.matches); // initial value

  //   mq.addEventListener("change", handler);
  //   return () => mq.removeEventListener("change", handler);
  // }, []);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) {
      return;
    }

    const target = node.parentElement ?? node;

    const updateSize = () => {
      const rect = target.getBoundingClientRect();
      setAvailableSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setAvailableSize({ width, height });
        }
      });
      observer.observe(target);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // if (isMobile === null) return null; // wait for detection

  const fontSize = useMemo(() => {
    const width = availableSize.width;
    const height = availableSize.height;

    if (!width || !height) {
      return 7;
    }

    const widthForCalc = Math.min(width, height * ART_ASPECT * CHAR_WIDTH_RATIO);
    const widthBased = widthForCalc / (artColumns * CHAR_WIDTH_RATIO);
    const heightBased = height / artRows;
    const rawSize = Math.min(widthBased, heightBased);
    const maxCap = MAX_FONT_DESKTOP;

    return Math.max(MIN_FONT, Math.min(rawSize, maxCap));
  }, [availableSize]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      <pre
        // className={isMobile ? "" : "rainbow-ascii"}
        className="rainbow-ascii"
        style={{
          fontFamily: "monospace",
          fontSize: `${fontSize}px`,
          lineHeight: `${fontSize * 0.95}px`,
          whiteSpace: "pre",
          textAlign: "center",
          margin: 0,
          padding: 0,
          // color: isMobile ? "var(--color-primary)" : "transparent",
          color: "transparent",
        }}
      >
        {magiAsciiArt}
      </pre>
    </div>
  );
}
