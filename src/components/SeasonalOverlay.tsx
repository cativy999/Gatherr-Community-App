// SeasonalOverlay — November only. Remove <SeasonalOverlay /> from Wards.tsx to disable.
const isNovember = new Date().getMonth() === 10;

const leaves = [
  // Desktop + mobile: corners
  { src: "/leaves/leaf1.svg", style: { top: 0, left: 0, width: 180, transform: "rotate(-10deg) translate(-30px, -20px)", opacity: 0.85 } },
  { src: "/leaves/leaf2.svg", style: { top: 0, right: 0, width: 160, transform: "rotate(15deg) translate(20px, -10px)", opacity: 0.8 } },
  { src: "/leaves/leaf3.svg", style: { bottom: 80, left: 0, width: 150, transform: "rotate(10deg) translate(-25px, 10px)", opacity: 0.75 } },
  { src: "/leaves/leaf4.svg", style: { bottom: 80, right: 0, width: 170, transform: "rotate(-20deg) translate(25px, 15px)", opacity: 0.8 } },
  // Desktop only: extra mid-edge leaves
  { src: "/leaves/leaf1.svg", style: { top: "40%", right: 0, width: 120, transform: "rotate(30deg) translate(30px, 0)", opacity: 0.6 }, desktopOnly: true },
  { src: "/leaves/leaf3.svg", style: { top: "30%", left: 0, width: 110, transform: "rotate(-25deg) translate(-28px, 0)", opacity: 0.55 }, desktopOnly: true },
  { src: "/leaves/leaf2.svg", style: { top: "65%", left: 0, width: 130, transform: "rotate(5deg) translate(-30px, 0)", opacity: 0.6 }, desktopOnly: true },
];

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
      {leaves.map((leaf, i) => (
        <img
          key={i}
          src={leaf.src}
          alt=""
          className={leaf.desktopOnly ? "hidden md:block" : ""}
          style={{
            position: "absolute",
            ...leaf.style,
          }}
        />
      ))}
    </div>
  );
};

export default SeasonalOverlay;
