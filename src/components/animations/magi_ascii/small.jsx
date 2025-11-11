import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTerminalWindow } from "../../terminal/TerminalWindowProvider.jsx";

const art = String.raw`

                                   ####                                   
                                #####.####                                
                             ########<...####                             
                          ###########<<-....####                          
                      ###############<<<*......)####                      
                   ##################<<<<>........:####                   
                #####################<<<<<<...........####                
             ####@@@=.###############<<<<<<<.............####             
         %####@@@@@@@)...{###########<<<<<<<<...............{###%         
      ####%@@@@@@@@@@@#.....#########<<<<<<<<<.................*####      
   ####@@@@@@@@@@@@@@@@%.==##########<<<<<<<<<<==:................:####   
####@@@@@@@@@@@@@@@@@%#*==###########<<<<<<<<<<<====+.................####
##=@@@@@@@@@@@@@@@#####==############<<<<<<<<<<<<======+................##
##====}@@@@@@@@#######==#############<<<<<<<<<<<<<=========.............##
##=======*@@#########)=##############<<<<<<<<<<<<<<===========..........##
##===========########=###############<<<<<<<<<<<<<<<=========...........##
##==============####=################<<<<<<<<<<<<<<<<+====..............##
##=================}#################<<<<<<<<<<<<<<<<<*.................##
##@@@=================<##############<<<<<<<<<<<<<<+.................@@@##
##@@@@@@+================+###########<<<<<<<<<<<.................:@@@@@@##
##@@@@@@@@@]=================########<<<<<<<<.................<@@@@@@@@@##
##@@@@@@@@@@@@%=================#####<<<<<.................%@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@=================}#<>.................@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@@@@================................#@@@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@@@=^@@*============............-##~.@@@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@@@#==@@@@}=========.........(####..#@@@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@@@@===@@@@@@@======......#######...@@@@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@@@@>=======+%@@@===...###{........+@@@@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@@@@@@@===============...............@@@@@@@@@@@@@@@@@@@@##
##@@@@@@@@@@@@@@.===@@=============##...............@@===.@@@@@@@@@@@@@@##
##@@@@@@@@@@@.~======@@==========####..............@@======~.@@@@@@@@@@@##
##@@@@@@@@..==========+====+#########><<<<<<<<:....+==========..@@@@@@@@##
##@@@@[...=========+###############==..<<<<<<<<<<<<<<<+=========...]@@@@##
##@-...+===========#############+====....:<<<<<<<<<<<<<===========+...-@##
####@@@@============[#########===##)=.+<<...<<<<<<<<<>============@@@@####
   ####@@@============#####]====#####<<<<<....*<<<<<============@@@####   
      ####%@[==========+####===>#####<<<<<=...<<<<+==========[@%####      
         #####@==========####==######<<<<<<..<<<<==========@#####         
             ####+=========##########<<<<<<<<<<=========+####             
                ####@@@@@@@@%########<<<<<<<<]@@@@@@@@####                
                   ####@@@@@@@#######<<<<<<<@@@@@@@####                   
                      ####%@@@@@#####<<<<<@@@@@%####                      
                          ####@@@####<<<<@@@####                          
                             ####@@##<<@@####                             
                                ####%{####                                
                                   ####                                   

`;
const artLines = art.split("\n").filter(Boolean);
const artColumns = Math.max(...artLines.map((line) => line.length));
const artRows = artLines.length;

const MIN_FONT = 5;
const MAX_FONT = 14;
const CHAR_WIDTH_RATIO = 1.2; // monospace approximation

export default function AsciiArt() {
  const [isMobile, setIsMobile] = useState(null); // prevent first-frame flicker
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });
  const wrapperRef = useRef(null);
  const { dimensions } = useTerminalWindow();

  // Efficient mobile detection
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");

    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches); // initial value

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const node = wrapperRef.current;

    const resize = () => {
      const rect = node.getBoundingClientRect();
      setWrapperSize({ width: rect.width, height: rect.height });
    };

    resize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setWrapperSize({ width, height });
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  if (isMobile === null) return null; // wait for detection

  const fontSize = useMemo(() => {
    const fallbackWidth = wrapperSize.width;
    const fallbackHeight = wrapperSize.height;
    const availableWidth = isMobile ? fallbackWidth : dimensions?.width ?? fallbackWidth;
    const availableHeight = isMobile ? fallbackHeight : dimensions?.height ?? fallbackHeight;

    const width = (() => {
      if (availableWidth && fallbackWidth) return Math.min(availableWidth, fallbackWidth);
      return availableWidth || fallbackWidth;
    })();

    const height = (() => {
      if (availableHeight && fallbackHeight) return Math.min(availableHeight, fallbackHeight);
      return availableHeight || fallbackHeight;
    })();

    if (!width || !height) {
      return 7;
    }

    const widthBased = width / (artColumns * CHAR_WIDTH_RATIO);
    const heightBased = height / artRows;
    const rawSize = Math.min(widthBased, heightBased);
    const maxCap = isMobile ? 12 : MAX_FONT;

    return Math.max(MIN_FONT, Math.min(rawSize, maxCap));
  }, [wrapperSize, isMobile, dimensions]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%",
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
        {art}
      </pre>
    </div>
  );
}
