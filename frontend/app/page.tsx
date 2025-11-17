// app/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    // --- 1. Use theme-aware background colors ---

    <div className="min-h-dvh flex items-center justify-center bg-background ">
      <div className="text-center space-y-8 px-4">
        {/* --- 2. Use theme-aware text colors --- */}
        <h1 className="text-6xl font-bold text-foreground">
          Welcome to <span className="text-primary">Social App</span>
        </h1>

        {/* --- 3. Use theme-aware text colors --- */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connect with friends, share your thoughts, and explore amazing
          content.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <Button size="lg">Sign In</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
