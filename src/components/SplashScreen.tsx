import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

const HOLD_MS = 1600;
const EXIT_MS = 700;

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const showTimer = requestAnimationFrame(() => setVisible(true));
    const exitTimer = setTimeout(() => setExiting(true), HOLD_MS);
    const finishTimer = setTimeout(() => onFinish(), HOLD_MS + EXIT_MS);
    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Striped background band */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "58%",
          width: "100%",
          height: "48%",
          transform: exiting ? "translateY(140%)" : "translateY(0)",
          opacity: visible ? 1 : 0,
          transition: `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease`,
        }}
      >
        <img
          src="/Background.png"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      </div>

      {/* Beyond Sunday logo */}
      <div
        style={{
          position: "absolute",
          left: "9%",
          top: "18%",
          width: "82%",
          transform: exiting ? "translateX(-160%)" : visible ? "translateX(0)" : "translateX(-30px)",
          opacity: visible ? 1 : 0,
          transition: `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms ease`,
        }}
      >
        <img
          src="/BeyondSundaySplashLogo.png"
          alt="Beyond Sunday"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      {/* Splash items (umbrella, bike, skateboard) */}
      <div
        style={{
          position: "absolute",
          left: "9%",
          top: "53%",
          width: "82%",
          transform: exiting ? "translateX(160%)" : visible ? "translateX(0)" : "translateX(30px)",
          opacity: visible ? 1 : 0,
          transition: `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms ease`,
        }}
      >
        <img
          src="/SplashItems.png"
          alt=""
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
