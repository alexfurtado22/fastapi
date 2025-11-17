// components/posts/post-card.tsx
import { Button } from "@/components/ui/button";
import { Post } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface PostCardProps {
  post: Post;
  onDelete?: (id: number) => void;
  isOwner?: boolean;
  priority?: boolean;
}

export function PostCard({
  post,
  onDelete,
  isOwner,
  priority = false,
}: PostCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isValidUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 space-y-4 border">
      {/* --- VIDEO BLOCK --- */}
      {post.video_url && isValidUrl(post.video_url) && (
        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
          <video
            src={post.video_url}
            controls
            playsInline
            muted
            loop
            className="w-full h-full object-cover"
            preload="metadata"
          />
        </div>
      )}

      {/* --- IMAGE BLOCK (only if no video) --- */}
      {post.image_url && !post.video_url && isValidUrl(post.image_url) && (
        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw,
                   (max-width: 1200px) 50vw,
                   33vw"
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      )}

      {/* Title */}
      <div>
        <Link href={`/dashboard/posts/${post.id}`}>
          <h2 className="text-2xl font-bold hover:text-primary cursor-pointer">
            {post.title}
          </h2>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">
          {formatDate(post.created_at)}
        </p>
      </div>

      {/* Content Preview */}
      {post.content && (
        <p className="text-muted-foreground line-clamp-3">{post.content}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Link href={`/dashboard/posts/${post.id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>

        {isOwner && (
          <>
            <Link href={`/dashboard/posts/${post.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete?.(post.id)}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
