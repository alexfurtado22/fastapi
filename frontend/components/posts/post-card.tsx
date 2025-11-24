// components/posts/post-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { postsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Post } from "@/types";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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
  // Like State (Optimistic UI)
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [likeCount, setLikeCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;

    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    setIsLiking(true);

    try {
      await postsAPI.toggleLike(post.id);

      // Show success toast only when liking (not unliking)
      if (!previousLiked) {
        toast.success("Post liked! ❤️");
      }
    } catch (err: unknown) {
      // Revert optimistic update
      setIsLiked(previousLiked);
      setLikeCount(previousCount);

      // Narrow unknown error to a structured shape before reading fields
      type ApiError = {
        response?: { status?: number; data?: { detail?: string } };
        status?: number;
        message?: string;
      };
      const errorObj = (err as ApiError) ?? {};

      // Handle specific errors
      const status = errorObj.response?.status ?? errorObj.status;
      const errorMessage = errorObj.response?.data?.detail ?? errorObj.message;

      if (status === 400) {
        toast.error("Cannot like post", {
          description: errorMessage ?? "You cannot like your own post",
        });
      } else if (status === 401) {
        toast.error("Authentication required", {
          description: "Please login to like posts",
        });
      } else {
        toast.error("Failed to toggle like", {
          description: "Please try again",
        });
      }

      // Only log unexpected errors (not 400/401)
      if (status !== 400 && status !== 401) {
        console.error("Failed to toggle like", err);
      }
    } finally {
      setIsLiking(false);
    }
  };

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
    <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 space-y-4 border flex flex-col h-full">
      {/* Video Block */}
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

      {/* Image Block */}
      {post.image_url && !post.video_url && isValidUrl(post.image_url) && (
        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      )}

      {/* Content */}
      <div className="grow">
        <Link href={`/dashboard/posts/${post.id}`}>
          <h2 className="text-2xl font-bold hover:text-primary cursor-pointer line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {/* Date + Like */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground">
            {formatDate(post.created_at)}
          </p>

          {/* Like Button */}
          <Button
            variant="ghost"
            size="sm"
            disabled={isLiking}
            className="flex items-center gap-1 px-2 h-8 hover:bg-transparent"
            onClick={handleLike}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isLiked
                  ? "fill-red-500 text-red-500 scale-110"
                  : "text-muted-foreground scale-100"
              )}
            />
            <span
              className={cn(
                "text-sm transition-colors",
                isLiked ? "text-red-500" : "text-muted-foreground"
              )}
            >
              {likeCount}
            </span>
          </Button>
        </div>

        {post.content && (
          <p className="text-muted-foreground line-clamp-3 mt-2">
            {post.content}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 mt-auto">
        <Link href={`/dashboard/posts/${post.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View
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
