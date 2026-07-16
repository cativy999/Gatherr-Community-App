import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

const HOLD_MS = 1800;
const EXIT_MS = 500;

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Detect dark mode from the <html> class (Tailwind class-based dark mode)
  const isDark = document.documentElement.classList.contains("dark")
    || window.matchMedia("(prefers-color-scheme: dark)").matches;

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
        background: isDark ? "#111111" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: exiting ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease`,
      }}
    >
      <img
        src="/spashscreen.png"
        alt="Beyond Sunday"
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          transform: visible ? "scale(1)" : "scale(0.82)",
          opacity: visible ? 1 : 0,
          transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease",
        }}
      />
    </div>
  );
};

export default SplashScreen;
