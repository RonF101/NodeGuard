import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { on, subscribe, removeChannel, channel, getSupabaseClient } = vi.hoisted(() => {
  const on = vi.fn();
  const subscribe = vi.fn();
  const removeChannel = vi.fn();
  const channel = { on, subscribe };
  on.mockReturnValue(channel);
  return {
    on,
    subscribe,
    removeChannel,
    channel,
    getSupabaseClient: vi.fn(() => ({
      channel: vi.fn(() => channel),
      removeChannel,
    })),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/supabaseClient", () => ({ getSupabaseClient }));
vi.mock("@/components/connectivity/ConnectivityProvider", () => ({
  useConnectivity: () => ({ lowBandwidth: false }),
}));

import { RealtimeRefresh } from "@/components/RealtimeRefresh";

describe("RealtimeRefresh", () => {
  it("subscribes to alert-level, activity, backup, assignment, and incident changes", async () => {
    const view = render(<RealtimeRefresh />);
    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    const tables = on.mock.calls.map((call) => call[1]?.table);
    expect(tables).toEqual(expect.arrayContaining([
      "incidents",
      "incident_assignments",
      "incident_priority_updates",
      "incident_activity_events",
      "backup_requests",
      "backup_offers",
      "notifications",
    ]));
    view.unmount();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
