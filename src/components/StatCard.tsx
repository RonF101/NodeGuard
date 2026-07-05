import { ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

type StatCardProps = {
  label: string;
  value: string | number;
  helper: string;
  tone: string;
  icon: ReactNode;
};

export function StatCard({ label, value, helper, tone, icon }: StatCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
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
              display: "grid",
              placeItems: "center",
              bgcolor: `${tone}1A`,
              color: tone
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}
