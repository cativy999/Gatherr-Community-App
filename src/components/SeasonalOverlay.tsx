// SeasonalOverlay — November only. Remove <SeasonalOverlay /> from Wards.tsx to disable.
const isNovember = new Date().getMonth() === 10;

const SeasonalOverlay = () => {
  if (!isNovember) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Top-right corner — desktop */}
      <img
        src="/seasonal background/thanksgiving.png"
        alt=""
        className="hidden md:block"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 420,
          opacity: 0.92,
        }}
      />
      {/* Top-right corner — mobile (smaller) */}
      <img
        src="/seasonal background/thanksgiving.png"
        alt=""
        className="block md:hidden"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 200,
          opacity: 0.88,
        }}
      />
    </div>
  );
};

export default SeasonalOverlay;
