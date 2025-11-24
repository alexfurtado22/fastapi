// app/dashboard/posts/layout.tsx
import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Community Feed",
};

// 👇 THIS PART IS REQUIRED
export default function PostsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
