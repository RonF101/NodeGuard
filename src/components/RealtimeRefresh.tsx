"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";

export const NODEGUARD_REALTIME_EVENT = "nodeguard:realtime-change";

const realtimeTables = [
  "incidents",
  "responders",
  "incident_assignments",
  "incident_status_updates",
  "incident_priority_updates",
  "incident_activity_events",
  "backup_requests",
  "backup_offers",
  "notifications",
  "device_locations",
];

export function RealtimeRefresh() {
  const router = useRouter();
  const { lowBandwidth } = useConnectivity();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const triggerRefresh = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(NODEGUARD_REALTIME_EVENT));
        router.refresh();
      }, lowBandwidth ? 5_000 : 250);
    };

    const channel = supabase.channel("nodeguard-web-realtime");
    realtimeTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        triggerRefresh,
      );
    });
    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [lowBandwidth, router]);

  return null;
}
