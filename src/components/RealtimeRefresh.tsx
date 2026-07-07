"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const NODEGUARD_REALTIME_EVENT = "nodeguard:realtime-change";

const realtimeTables = [
  "incidents",
  "responders",
  "incident_assignments",
  "incident_status_updates",
  "notifications",
  "device_locations",
];

export function RealtimeRefresh() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const triggerRefresh = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(NODEGUARD_REALTIME_EVENT));
        router.refresh();
      }, 250);
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
  }, [router]);

  return null;
}
