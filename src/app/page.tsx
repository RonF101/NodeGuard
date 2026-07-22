"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LockIcon from "@mui/icons-material/Lock";
import MailIcon from "@mui/icons-material/Mail";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BrandLogo } from "@/components/BrandLogo";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import { mdrrmoPalette } from "@/theme/theme";
import type { OperationalRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoRole, setDemoRole] = useState<OperationalRole>("barangay_personnel");

  const configured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      void fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      })
        .then((response) => response.json())
        .then((result: { ok: boolean; home?: string }) => {
          if (result.ok && result.home) router.replace(result.home);
        });
    });
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const supabase = getSupabaseClient();

    if (!supabase) {
      window.localStorage.setItem("nodeguard.demo-role", demoRole);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoRole }),
      });
      const result = (await response.json()) as { ok: boolean; home?: string; reason?: string };
      setIsSubmitting(false);
      if (!result.ok || !result.home) {
        setError(result.reason ?? "Unable to open the selected workspace.");
        return;
      }
      router.push(result.home);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      await supabase.auth.signOut();
      setError("NodeGuard could not establish the dashboard session.");
      return;
    }
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: session.access_token }),
    });
    const result = (await response.json()) as { ok: boolean; home?: string; reason?: string };
    if (!result.ok || !result.home) {
      await supabase.auth.signOut();
      setError(result.reason ?? "This account is not linked to an authorized NodeGuard profile.");
      return;
    }
    router.push(result.home);
  };


  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "grid",
        placeItems: "center",
        p: { xs: 1.5, sm: 3 },
        backgroundImage:
          "linear-gradient(125deg, rgba(244,127,53,0.18) 0%, rgba(247,214,194,0.65) 35%, rgba(245,246,247,1) 36%, rgba(232,242,237,0.9) 100%)"
      }}
    >
      <Grid container spacing={3} sx={{ width: "100%", maxWidth: 1120, alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%", bgcolor: mdrrmoPalette.darkGreen, color: "white" }}>
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 5 }, height: "100%" }}>
              <Stack sx={{ height: "100%", justifyContent: "space-between" }} spacing={5}>
                <Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 4, alignItems: { xs: "flex-start", sm: "center" } }}>
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
                        Municipal Incident Management
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="h3" sx={{ maxWidth: 520 }}>
                    One incident record for every report, response, and resolution.
                  </Typography>
                  <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.78)", maxWidth: 520 }}>
                    Barangays manage local incidents, LT-MDRRMO records and coordinates municipal cases, and IoT nodes provide an additional public reporting option where installed.
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
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 5 } }}>
              <BrandLogo />
              <Typography variant="h4" color="secondary" sx={{ mt: 4 }}>
                Authorized Personnel Login
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Your role and organization determine the operational workspace.
              </Typography>
              <Stack component="form" onSubmit={handleLogin} spacing={2.2} sx={{ mt: 4 }}>
                {!configured && (
                  <TextField select label="Demo workspace" value={demoRole} onChange={(event) => setDemoRole(event.target.value as OperationalRole)}>
                    <MenuItem value="barangay_personnel">Barangay Pico Personnel</MenuItem>
                    <MenuItem value="barangay_admin">Barangay Pico Administrator</MenuItem>
                    <MenuItem value="mdrrmo_operations">LT-MDRRMO Operations</MenuItem>
                    <MenuItem value="mdrrmo_admin">LT-MDRRMO Administrator</MenuItem>
                  </TextField>
                )}
                <TextField
                  label="Email"
                  placeholder="personnel@ltdrrmo.local"
                  fullWidth
                  value={email}
                  required={configured}
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
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
                  value={password}
                  required={configured}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
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
                  {["Barangay Personnel Dashboard", "LT-MDRRMO Personnel Dashboard"].map((role) => (
                    <Chip key={role} label={role} icon={<AdminPanelSettingsIcon />} variant="outlined" />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">Field responders receive assignments and submit field updates through the NodeGuard Personnel mobile application, not the controller dashboard.</Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <Button size="large" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Signing In..."
                    : configured
                      ? "Login to Dashboard"
                      : "Enter Demo Dashboard"}
                </Button>
              </Stack>
              <Divider sx={{ my: 4 }} />
              <Typography variant="body2" color="text.secondary">
                {configured
                  ? "Use the Supabase account issued by the NodeGuard administrator. Access is checked against the linked personnel profile."
                  : "Demo mode is active. Configure Supabase environment variables before operational deployment."}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
