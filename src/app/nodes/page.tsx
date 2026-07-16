import { Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { NodesView } from "@/components/NodesView";

export default function NodesPage() {
  return (
    <Suspense fallback={<Stack sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}><CircularProgress /></Stack>}>
      <NodesView />
    </Suspense>
  );
}
