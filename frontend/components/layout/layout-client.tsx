// app/layout-client.tsx
"use client";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { usePathname } from "next/navigation";
import React from "react";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthPage) {
    // Special layout for Auth pages (no header/footer)
    return (
      <div className="flex flex-col min-h-dvh">
        <main className="grow">{children}</main>
        <Footer />
      </div>
    );
  } // Default layout for all other pages

  return (
    <div className="holder grid min-h-dvh grid-rows-[auto_1fr_auto]">
      <Header />
      <main className="col-span-2 grid grid-cols-1">{children}</main>
      <Footer />
    </div>
  );
}
