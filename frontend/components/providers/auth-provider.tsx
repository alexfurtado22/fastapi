// components/providers/auth-provider.tsx
"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useEffect } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    // Check if user is logged in on mount
    fetchUser();
  }, [fetchUser]);

  return <>{children}</>;
}
