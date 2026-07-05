import type { Metadata } from "next";
import { ReactNode } from "react";
import { ThemeRegistry } from "./ThemeRegistry";

export const metadata: Metadata = {
  title: "NodeGuard | La Trinidad MDRRMO",
  description: "Emergency response coordination dashboard prototype"
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
