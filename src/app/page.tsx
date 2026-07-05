"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LockIcon from "@mui/icons-material/Lock";
import MailIcon from "@mui/icons-material/Mail";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BrandLogo } from "@/components/BrandLogo";
import { mdrrmoPalette } from "@/theme/theme";

export default function LoginPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "grid",
        placeItems: "center",
        p: 3,
        backgroundImage:
          "linear-gradient(125deg, rgba(244,127,53,0.18) 0%, rgba(247,214,194,0.65) 35%, rgba(245,246,247,1) 36%, rgba(232,242,237,0.9) 100%)"
      }}
    >
      <Grid container spacing={3} sx={{ width: "100%", maxWidth: 1120, alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%", bgcolor: mdrrmoPalette.darkGreen, color: "white" }}>
            <CardContent sx={{ p: { xs: 3, md: 5 }, height: "100%" }}>
              <Stack sx={{ height: "100%", justifyContent: "space-between" }} spacing={5}>
                <Box>
                  <Stack direction="row" spacing={2} sx={{ mb: 4, alignItems: "center" }}>
                    <Badge color="primary" variant="dot">
                      <Box
                        sx={{
                          width: 62,
                          height: 62,
                          borderRadius: "50%",
                          bgcolor: mdrrmoPalette.cream,
                          border: "4px solid white",
                          overflow: "hidden",
                          position: "relative"
                        }}
                      >
                        <Image
                          src="/mdrrmc-logo.png"
                          alt="La Trinidad MDRRMC logo"
                          fill
                          sizes="62px"
                          style={{ objectFit: "contain" }}
                          priority
                        />
                      </Box>
                    </Badge>
                    <Box>
                      <Typography variant="h4">NodeGuard</Typography>
                      <Typography sx={{ color: mdrrmoPalette.cream, fontWeight: 700 }}>
                        Emergency Coordination Dashboard
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="h3" sx={{ maxWidth: 520 }}>
                    La Trinidad MDRRMO operations dashboard for coordinated response.
                  </Typography>
                  <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.78)", maxWidth: 520 }}>
                    Monitor NodeGuard alerts, verify field reports, assign responders, and review incident records from one calm control surface.
                  </Typography>
                </Box>
                <Box
                  sx={{
                    borderLeft: `5px solid ${mdrrmoPalette.orange}`,
                    pl: 2,
                    py: 1,
                    bgcolor: "rgba(255,255,255,0.08)"
                  }}
                >
                  <Typography variant="h6">
                    The future belongs to those who prepare for it today.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <BrandLogo />
              <Typography variant="h4" color="secondary" sx={{ mt: 4 }}>
                Personnel Login
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                La Trinidad MDRRMO Emergency Coordination Dashboard
              </Typography>
              <Stack spacing={2.2} sx={{ mt: 4 }}>
                <TextField
                  label="Email"
                  placeholder="personnel@ltdrrmo.local"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailIcon />
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {["Personnel", "Admin", "Super Admin"].map((role) => (
                    <Chip key={role} label={role} icon={<AdminPanelSettingsIcon />} variant="outlined" />
                  ))}
                </Stack>
                <Button size="large" onClick={() => router.push("/dashboard")}>
                  Login to Dashboard
                </Button>
              </Stack>
              <Divider sx={{ my: 4 }} />
              <Typography variant="body2" color="text.secondary">
                Prototype only: authentication and role-based authorization are placeholders for future integration.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
