import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    session_recording: { maskAllInputs: true },
  });

  // Internal-user opt-out toggle via ?internal=1 / ?internal=0
  const params = new URLSearchParams(window.location.search);
  if (params.get("internal") === "1") {
    localStorage.setItem("ph_internal", "1");
    posthog.opt_out_capturing();
  } else if (params.get("internal") === "0") {
    localStorage.removeItem("ph_internal");
    posthog.opt_in_capturing();
  } else if (localStorage.getItem("ph_internal") === "1") {
    posthog.opt_out_capturing();
  }
}

createRoot(document.getElementById("root")!).render(<App />);
