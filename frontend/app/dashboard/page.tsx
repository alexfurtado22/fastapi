// app/dashboard/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen ">
        {/* Header */}
        <header className="shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Welcome, {user?.full_name || user?.email}!
            </h2>
            <div className="space-y-2 ">
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
          <div>
            <Link href="/dashboard/posts">
              <Button variant="outline" className="mt-4">
                View All Posts
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
