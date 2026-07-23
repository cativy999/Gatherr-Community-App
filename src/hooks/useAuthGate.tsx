import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthGateSheet from "@/components/AuthGateSheet";

/**
 * useAuthGate — gate any action behind authentication.
 *
 * Usage:
 *   const { requireAuth, GateSheet } = useAuthGate();
 *
 *   // In JSX: render {GateSheet} anywhere in the tree
 *   // On action: onClick={() => requireAuth(() => doSomething())}
 */
export function useAuthGate() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  const requireAuth = (action?: () => void) => {
    if (session) {
      action?.();
    } else {
      setOpen(true);
    }
  };

  const GateSheet = open ? <AuthGateSheet onClose={() => setOpen(false)} /> : null;

  return { requireAuth, GateSheet };
}
