import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create New Post",
};

export default function CreatePostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
