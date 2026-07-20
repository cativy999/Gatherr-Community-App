import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

const HOLD_MS = 1800;
const EXIT_MS = 500;

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [exiting, setExiting] = useState(false);

  const isDark = document.documentElement.classList.contains("dark")
    || window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    // Hide the static HTML splash that showed before React loaded
    const htmlSplash = document.getElementById("native-splash");
    if (htmlSplash) htmlSplash.style.display = "none";

    const exitTimer = setTimeout(() => setExiting(true), HOLD_MS);
    const finishTimer = setTimeout(() => onFinish(), HOLD_MS + EXIT_MS);
    return () => {
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
        paddingBottom: "22%",
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
        }}
      />
    </div>
  );
};

export default SplashScreen;
