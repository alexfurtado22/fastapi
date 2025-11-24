// app/dashboard/posts/[id]/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentItem } from "@/components/comments/comment-item";
import { Button } from "@/components/ui/button";
import { commentsAPI, postsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { PostWithDetails } from "@/types";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [post, setPost] = useState<PostWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Like loading (to block spam-clicking)
  const [isLiking, setIsLiking] = useState(false);

  const postId = Number(params.id);
  const isOwner = post?.owner_id === user?.id;

  const loadPost = useCallback(async () => {
    if (!postId) return;

    try {
      setError("");
      const data = await postsAPI.getById(postId);
      setPost(data);
    } catch (err) {
      setError("Failed to load post");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // --- LIKE POST ---
  const handleLike = async () => {
    if (!post || isLiking) return;

    const previous = { ...post };
    const nextLiked = !post.user_has_liked;
    const nextCount = nextLiked ? post.likes_count + 1 : post.likes_count - 1;

    setPost({
      ...post,
      user_has_liked: nextLiked,
      likes_count: nextCount,
    });
    setIsLiking(true);

    try {
      await postsAPI.toggleLike(post.id);

      // Show success toast
      if (nextLiked) {
        toast.success("Post liked! ❤️");
      }
    } catch (error: unknown) {
      // Revert on error
      setPost(previous);

      // Show error toast
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string" &&
        (error as { message?: string }).message?.includes(
          "cannot like your own post"
        )
      ) {
        toast.error("Cannot like post", {
          description: "You cannot like your own post",
        });
      } else {
        toast.error("Failed to toggle like", {
          description: "Please try again",
        });
      }

      // Only log unexpected errors (not 400/401)
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response ===
          "object" &&
        (error as { response?: { status?: number } }).response?.status !==
          400 &&
        (error as { response?: { status?: number } }).response?.status !== 401
      ) {
        console.error("Failed to toggle like:", error);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await postsAPI.delete(postId);
      toast.success("Post deleted successfully");
      router.push("/dashboard/posts");
    } catch (err) {
      toast.error("Failed to delete post", {
        description: "Please try again",
      });
      console.error(err);
    }
  };

  const handleCreateComment = async (content: string) => {
    try {
      await commentsAPI.create(postId, content);
      toast.success("Comment posted successfully! 💬");
      await loadPost();
    } catch (err) {
      toast.error("Failed to create comment", {
        description: "Please try again",
      });
      console.error("Failed to create comment:", err);
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    try {
      await commentsAPI.update(commentId, content);
      toast.success("Comment updated successfully");
      await loadPost();
    } catch (err) {
      toast.error("Failed to update comment", {
        description: "Please try again",
      });
      console.error("Failed to update comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentsAPI.delete(commentId);
      toast.success("Comment deleted successfully");
      await loadPost();
    } catch (err) {
      toast.error("Failed to delete comment", {
        description: "Please try again",
      });
      console.error("Failed to delete comment:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isValidUrl = (url: string | null) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !post) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-destructive text-destructive-foreground p-4 rounded-lg mb-6">
              {error || "Post not found"}
            </div>

            <Link href="/dashboard/posts">
              <Button>Back to Posts</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/posts">
                <Button variant="ghost">← Back to Posts</Button>
              </Link>

              {isOwner && (
                <div className="flex gap-2">
                  <Link href={`/dashboard/posts/${postId}/edit`}>
                    <Button variant="outline">Edit</Button>
                  </Link>

                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <article className="bg-card rounded-lg shadow-md overflow-hidden">
            {/* Video */}
            {post.video_url && isValidUrl(post.video_url) && (
              <div className="relative w-full h-96 bg-muted">
                <video
                  src={post.video_url}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Image */}
            {post.image_url &&
              !post.video_url &&
              isValidUrl(post.image_url) && (
                <div className="relative w-full h-96 bg-muted">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 896px"
                    priority
                  />
                </div>
              )}

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Title & Meta */}
              <div>
                <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

                <div className="flex items-center justify-between">
                  {/* Left side */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>By {post.owner.full_name || post.owner.email}</span>
                    <span>•</span>
                    <span>{formatDate(post.created_at)}</span>

                    {post.updated_at !== post.created_at && (
                      <>
                        <span>•</span>
                        <span className="italic">Edited</span>
                      </>
                    )}
                  </div>

                  {/* Like Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLiking}
                    onClick={handleLike}
                    className="flex items-center gap-1 px-2 h-8 hover:bg-transparent"
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        post.user_has_liked
                          ? "fill-red-500 text-red-500 scale-110"
                          : "text-muted-foreground scale-100"
                      )}
                    />

                    <span
                      className={cn(
                        "text-sm transition-colors",
                        post.user_has_liked
                          ? "text-red-500"
                          : "text-muted-foreground"
                      )}
                    >
                      {post.likes_count}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Content */}
              {post.content && (
                <div className="prose prose-lg max-w-none">
                  <p className="whitespace-pre-wrap text-foreground">
                    {post.content}
                  </p>
                </div>
              )}

              {/* Comments */}
              <div className="border-t pt-6">
                <h2 className="text-2xl font-bold mb-4">
                  Comments ({post.comments.length})
                </h2>

                {user && (
                  <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                    <CommentForm onSubmit={handleCreateComment} />
                  </div>
                )}

                {post.comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {post.comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        isOwner={comment.owner_id === user?.id}
                        onUpdate={handleUpdateComment}
                        onDelete={handleDeleteComment}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        </main>
      </div>
    </ProtectedRoute>
  );
}
