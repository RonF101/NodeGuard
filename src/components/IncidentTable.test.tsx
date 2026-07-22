import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IncidentTable } from "@/components/IncidentTable";
import type { AlertLevel, EmergencyCategory, Incident } from "@/types";

function incident(
  id: string,
  alertLevel: AlertLevel,
  category: EmergencyCategory,
  timestamp: string,
): Incident {
  return {
    id,
    category,
    deviceId: `NODE-${id}`,
    location: `${id} Location`,
    timestamp,
    status: "Pending Verification",
    triggerMethod: "Voice",
    voiceContext: "No voice context",
    callerContext: "Test",
    assignedResponder: "Unassigned",
    alertLevel,
  };
}

const incidents = [
  incident("NG-LOW", "Low", "Medical Emergency", "2026-07-17T09:00:00+08:00"),
  incident("NG-UNASSESSED", "Unassessed", "Security/Public Safety", "2026-07-17T08:00:00+08:00"),
  incident("NG-CRITICAL", "Critical", "Fire/Disaster Emergency", "2026-07-17T10:00:00+08:00"),
];

describe("IncidentTable header behavior", () => {
  it("defaults to Unassessed then descending known urgency", () => {
    render(<IncidentTable incidents={incidents} showFilters={false} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("NG-UNASSESSED")).toBeInTheDocument();
    expect(within(rows[1]).getByText("NG-CRITICAL")).toBeInTheDocument();
    expect(within(rows[2]).getByText("NG-LOW")).toBeInTheDocument();
  });

  it("keeps Location and Assigned Team plain while preserving Reported sorting", () => {
    render(<IncidentTable incidents={incidents} showFilters={false} />);
    expect(within(screen.getByRole("columnheader", { name: "Location" })).queryByRole("button")).not.toBeInTheDocument();
    expect(within(screen.getByRole("columnheader", { name: "Assigned Team" })).queryByRole("button")).not.toBeInTheDocument();
    expect(within(screen.getByRole("columnheader", { name: /Reported/ })).getByRole("button")).toBeInTheDocument();
  });

  it("filters from the Category header without changing alert-level sorting", async () => {
    render(<IncidentTable incidents={incidents} showFilters={false} />);
    const categoryFilter = screen.getByLabelText("Filter incidents by emergency category");
    fireEvent.mouseDown(categoryFilter);
    fireEvent.click(await screen.findByRole("option", { name: "Medical Emergency" }));
    expect(screen.getAllByText("NG-LOW")).toHaveLength(2);
    expect(screen.queryByText("NG-CRITICAL")).not.toBeInTheDocument();
    expect(screen.queryByText("NG-UNASSESSED")).not.toBeInTheDocument();
  });

  it("paginates large incident lists while keeping the table readable", () => {
    const largeList = Array.from({ length: 30 }, (_, index) => incident(`NG-${String(index + 1).padStart(3, "0")}`, "Moderate", "Medical Emergency", `2026-07-${String((index % 20) + 1).padStart(2, "0")}T09:00:00+08:00`));
    render(<IncidentTable incidents={largeList} showFilters={false} />);
    expect(screen.getByText("1–10 of 30")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Go to next page"));
    expect(screen.getByText("11–20 of 30")).toBeInTheDocument();
  });
});
