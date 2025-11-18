// app/dashboard/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      <div className="col-span-2">
        {/* Content (Header is handled by LayoutClient) */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

          <div className="bg-card shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Welcome, {user?.full_name || user?.email}!
            </h2>

            <div className="space-y-2">
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {user?.is_verified ? "✅ Verified" : "⚠️ Not Verified"}
              </p>
              <p>
                <strong>Account:</strong>{" "}
                {user?.is_active ? "🟢 Active" : "🔴 Inactive"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <Link href="/dashboard/posts">
              <Button variant="outline">View All Posts</Button>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
