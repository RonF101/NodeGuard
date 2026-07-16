import { Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<Stack sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}><CircularProgress /></Stack>}>
      <IncidentOperationsView mode="registry" />
    </Suspense>
  );
}
