// app/layout.tsx
import LayoutClient from "@/components/layout/layout-client";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: APP_NAME,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* AuthProvider wraps the app so Header and all pages can read auth state */}
          <AuthProvider>
            {/* Client wrapper will decide to show Header/Footer */}
            <LayoutClient>{children}</LayoutClient>
          </AuthProvider>
        </ThemeProvider>
        {/* Sonner Toaster for toast notifications */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
