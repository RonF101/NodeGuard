import Image from "next/image";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const logoSize = compact ? 44 : 64;

  return (
    <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
      <Box
        sx={{
          width: logoSize,
          height: logoSize,
          borderRadius: "50%",
          bgcolor: "white",
          overflow: "hidden",
          flexShrink: 0,
          border: "2px solid rgba(244,127,53,0.35)",
          position: "relative"
        }}
      >
        <Image
          src="/mdrrmc-logo.png"
          alt="La Trinidad MDRRMC logo"
          fill
          sizes={`${logoSize}px`}
          style={{ objectFit: "contain" }}
          priority
        />
      </Box>
      <Box>
        <Typography variant={compact ? "subtitle1" : "h5"} color="secondary">
          NodeGuard
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          La Trinidad MDRRMO
        </Typography>
      </Box>
    </Stack>
  );
}
