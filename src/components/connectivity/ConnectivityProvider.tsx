"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type NavigatorWithConnection = Navigator & { connection?: NetworkInformation };

type ConnectivityContextValue = {
  online: boolean;
  lowBandwidth: boolean;
  manualLowBandwidth: boolean;
  mode: "online" | "low-bandwidth" | "offline";
  setManualLowBandwidth: (enabled: boolean) => void;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);
const preferenceKey = "nodeguard.low-bandwidth-mode";

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [manualLowBandwidth, setManualLowBandwidthState] = useState(false);
  const [constrainedConnection, setConstrainedConnection] = useState(false);

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    const update = () => {
      setOnline(navigator.onLine);
      setConstrainedConnection(
        Boolean(connection?.saveData) || ["slow-2g", "2g"].includes(connection?.effectiveType ?? ""),
      );
    };
    const restoreState = window.setTimeout(() => {
      setManualLowBandwidthState(window.localStorage.getItem(preferenceKey) === "true");
      update();
    }, 0);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener?.("change", update);
    return () => {
      window.clearTimeout(restoreState);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  const setManualLowBandwidth = useCallback((enabled: boolean) => {
    setManualLowBandwidthState(enabled);
    window.localStorage.setItem(preferenceKey, String(enabled));
  }, []);
  const lowBandwidth = online && (manualLowBandwidth || constrainedConnection);
  const value = useMemo<ConnectivityContextValue>(
    () => ({
      online,
      lowBandwidth,
      manualLowBandwidth,
      mode: online ? (lowBandwidth ? "low-bandwidth" : "online") : "offline",
      setManualLowBandwidth,
    }),
    [lowBandwidth, manualLowBandwidth, online, setManualLowBandwidth],
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity() {
  const value = useContext(ConnectivityContext);
  if (!value) throw new Error("useConnectivity must be used inside ConnectivityProvider");
  return value;
}
