import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, eyebrow, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ mb: 3, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography variant="overline" color="primary" sx={{ fontWeight: 900 }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h4" color="secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ width: { xs: "100%", sm: "auto" }, "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>{actions}</Box>}
    </Stack>
  );
}
