// SeasonalOverlay — November only. Remove <SeasonalOverlay /> from Wards.tsx to disable.
const isNovember = new Date().getMonth() === 10;

const SeasonalOverlay = () => {
  if (!isNovember) return null;

  return (
    <>
      {/* Layer 0: solid page background (fixed so it never scrolls) */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAF6F0",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {/* Layer 1: illustration — fixed, always top-right, behind all content */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Desktop */}
        <img
          src="/seasonal background/thanksgiving.png"
          alt=""
          className="hidden md:block"

          style={{ position: "absolute", top: 0, right: 0, width: 660, opacity: 0.95 }}
        />
        {/* Mobile: hidden — fixed positioning unreliable on iOS */}
      </div>
    </>
  );
};

export default SeasonalOverlay;
