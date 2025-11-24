import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Post",
};

export default function EditPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
