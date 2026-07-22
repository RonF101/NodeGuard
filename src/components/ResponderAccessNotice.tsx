"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { BrandLogo } from "@/components/BrandLogo";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function ResponderAccessNotice({ operatorName }: { operatorName: string }) {
  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.assign("/");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F3F7F5", display: "grid", placeItems: "center", p: 3 }}>
      <Card sx={{ width: "min(100%, 560px)" }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={2.5} sx={{ alignItems: "flex-start" }}>
            <BrandLogo />
            <PhoneAndroidOutlinedIcon color="primary" sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" color="secondary" sx={{ fontWeight: 900 }}>
                Continue in the responder app
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {operatorName}, field assignments, dispatch instructions, camera context, and status updates are available in the NodeGuard Personnel mobile application. Field responders do not use either controller dashboard.
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<LogoutOutlinedIcon />} onClick={() => void signOut()}>
              Sign out
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
