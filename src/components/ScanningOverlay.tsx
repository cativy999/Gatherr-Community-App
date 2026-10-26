const ScanningOverlay = () => (
  <>
    <style>{`
      @keyframes scan-line {
        0%   { top: 0%; }
        50%  { top: calc(100% - 3px); }
        100% { top: 0%; }
      }
      @keyframes scan-fade-in {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes scan-text-blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
    `}</style>

    {/* Backdrop */}
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      background: "rgba(0, 0, 0, 0.75)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}>

      {/* Card */}
      <div style={{
        animation: "scan-fade-in 0.3s ease-out both",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}>

        {/* Scanning frame */}
        <div style={{
          position: "relative",
          width: 220,
          height: 280,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(0,255,80,0.5), 0 0 24px rgba(0,255,80,0.2)",
        }}>
          {/* Illustration */}
          <img
            src="/Scan poster.png"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* Green scan tint overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 255, 80, 0.04)",
            pointerEvents: "none",
          }} />

          {/* Neon scanning line */}
          <div style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, transparent 0%, #00ff50 20%, #00ff50 80%, transparent 100%)",
            boxShadow: "0 0 6px 2px #00ff50, 0 0 18px 4px rgba(0,255,80,0.6), 0 0 40px 8px rgba(0,255,80,0.3)",
            animation: "scan-line 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite",
            pointerEvents: "none",
          }} />

          {/* Corner brackets */}
          {["top-left","top-right","bottom-left","bottom-right"].map(corner => (
            <div key={corner} style={{
              position: "absolute",
              width: 20, height: 20,
              ...(corner.includes("top")    ? { top: 8 }    : { bottom: 8 }),
              ...(corner.includes("left")   ? { left: 8 }   : { right: 8 }),
              borderTop:    corner.includes("top")    ? "2px solid #00ff50" : "none",
              borderBottom: corner.includes("bottom") ? "2px solid #00ff50" : "none",
              borderLeft:   corner.includes("left")   ? "2px solid #00ff50" : "none",
              borderRight:  corner.includes("right")  ? "2px solid #00ff50" : "none",
              borderRadius: corner === "top-left" ? "4px 0 0 0" : corner === "top-right" ? "0 4px 0 0" : corner === "bottom-left" ? "0 0 0 4px" : "0 0 4px 0",
            }} />
          ))}
        </div>

        {/* Status text */}
        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#00ff50",
          letterSpacing: "0.05em",
          animation: "scan-text-blink 1.4s ease-in-out infinite",
          textShadow: "0 0 10px rgba(0,255,80,0.6)",
        }}>
          AI is reading your poster…
        </p>
      </div>
    </div>
  </>
);

export default ScanningOverlay;
