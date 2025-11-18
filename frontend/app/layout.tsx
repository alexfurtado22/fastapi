// app/layout.tsx
import LayoutClient from "@/components/layout/layout-client";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Media App",
  description: "Built with Next.js and FastAPI",
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
            {/* 👈 2. Add the Header here */}
            {/* Client wrapper will decide to show Header/Footer */}
            <LayoutClient>{children}</LayoutClient>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
