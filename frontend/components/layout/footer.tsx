// components/layout/Footer.tsx
"use client";

import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

export function Footer() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <footer className="bg-background py-6 mt-12 col-span-2">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 w-full overflow-x-hidden">
        {/* Left side: copyright */}
        <div className="text-sm">
          &copy; {new Date().getFullYear()} Social Media App. All rights
          reserved.
        </div>

        {/* Middle: navigation links */}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/about" className="hover:text-white transition">
            About
          </Link>
          <Link href="/contact" className="hover:text-white transition">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-white transition">
            Privacy
          </Link>

          {/* Conditional links based on auth */}
          {isAuthenticated && (
            <>
              <Link href="/dashboard" className="hover:text-white transition">
                Dashboard
              </Link>
              {user?.is_superuser && (
                <Link href="/admin" className="hover:text-white transition">
                  Admin
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right side: social icons */}
        <div className="flex gap-4">
          <Link
            href="https://twitter.com"
            target="_blank"
            className="hover:text-white transition"
          >
            Twitter
          </Link>
          <Link
            href="https://github.com"
            target="_blank"
            className="hover:text-white transition"
          >
            GitHub
          </Link>
          <Link
            href="https://linkedin.com"
            target="_blank"
            className="hover:text-white transition"
          >
            LinkedIn
          </Link>
        </div>
      </div>
    </footer>
  );
}
