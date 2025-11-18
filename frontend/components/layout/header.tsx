"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModeToggle } from "../theme/theme-toggle";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <header className="col-span-2 py-4">
      <div className="h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold">
          MyApp
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-4">
          {!user ? (
            <>
              {/* Logo */}
              <Link href="/" className="text-xl font-bold">
                MyApp
              </Link>
              <Link href="/auth/login">
                <Button variant="outline">Login</Button>
              </Link>

              <Link href="/auth/register">
                <Button>Register</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>

              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}

          {/* Theme Toggle (desktop) */}
          <ModeToggle />
        </nav>

        {/* Mobile Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ModeToggle />

          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle Menu"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {open && (
        <div className="md:hidden border-t bg-background">
          <nav className="flex flex-col p-4 gap-3">
            {!user ? (
              <>
                <Link
                  href="/auth/login"
                  className="text-lg"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>

                <Link
                  href="/auth/register"
                  className="text-lg"
                  onClick={() => setOpen(false)}
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="text-lg"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                  className="text-left text-red-600 text-lg"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
