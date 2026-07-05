import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type ResponderSummaryCardProps = {
  label: string;
  value: number;
  helper: string;
  tone: string;
  icon: ReactNode;
};

export function ResponderSummaryCard({ label, value, helper, tone, icon }: ResponderSummaryCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
              {label}
            </Typography>
            <Typography variant="h4" color="secondary" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${tone}1A`,
              color: tone,
              display: "grid",
              placeItems: "center"
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}
