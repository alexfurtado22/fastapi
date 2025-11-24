// app/dashboard/posts/[id]/layout.tsx
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/posts/${id}`
    );

    if (!response.ok) {
      return { title: "Post Not Found" };
    }

    const post = await response.json();

    return {
      title: post.title,
      description: post.content?.substring(0, 160),
    };
  } catch {
    // 👈 FIXED: Removed '(error)' since we don't use it
    return { title: "Post Details" };
  }
}

export default function PostDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
