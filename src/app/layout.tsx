import type { Metadata } from "next";
import { ReactNode } from "react";
import { ThemeRegistry } from "./ThemeRegistry";

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: "NodeGuard | Barangay-First Emergency Operations",
  description: "Barangay emergency response with LT-MDRRMO central monitoring and escalation coordination",
  openGraph: {
    title: "NodeGuard | Barangay-First Emergency Operations",
    description: "Frontline barangay response with municipality-wide LT-MDRRMO monitoring and escalation coordination.",
    images: [{ url: "/nodeguard-social.png", width: 1200, height: 630, alt: "NodeGuard barangay-first emergency response" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NodeGuard | Barangay-First Emergency Operations",
    description: "Frontline barangay response with LT-MDRRMO coordination for escalated incidents.",
    images: ["/nodeguard-social.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
