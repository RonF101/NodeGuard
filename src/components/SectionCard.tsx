import type { ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between", mb: description ? 2 : 1.5 }}>
          <div>
            <Typography variant="h6" color="secondary">{title}</Typography>
            {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>}
          </div>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
