// app/layout.tsx
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header"; // 👈 1. Import Header;
import { AuthProvider } from "@/components/providers/auth-provider";
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
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* AuthProvider wraps the app so Header and all pages can read auth state */}
        <AuthProvider>
          {/* 👈 2. Add the Header here */}
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
