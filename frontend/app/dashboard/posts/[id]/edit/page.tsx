// app/dashboard/posts/[id]/edit/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PostForm } from "@/components/posts/post-form";
import { Button } from "@/components/ui/button";
import { postsAPI } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { useAuthStore } from "@/stores/auth-store";
import { Post } from "@/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type FormValues = {
  title: string;
  content: string;
  image_url?: string;
};

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const postId = Number(params.id);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      const data = await postsAPI.getById(postId);

      if (data.owner_id !== user?.id) {
        setError("You are not authorized to edit this post");
        return;
      }

      setPost(data);
    } catch (err) {
      setError("Failed to load post");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // --- UPDATED SUBMIT FUNCTION ---
  const handleSubmit = async (data: FormValues, mediaFile: File | null) => {
    try {
      setError("");
      setIsSubmitting(true);

      const postData: {
        title: string;
        content: string;
        image_url?: string | null;
        video_url?: string | null;
      } = {
        title: data.title,
        content: data.content,
        image_url: data.image_url,
        video_url: post?.video_url || null,
      };

      if (mediaFile) {
        let uploadedUrl: string;

        try {
          uploadedUrl = await uploadFile(mediaFile);
        } catch (uploadError) {
          setError("Failed to upload file");
          console.error("Upload error:", uploadError); // ✅ <--- ADD THIS LINE
          setIsSubmitting(false);
          return;
        }

        // Determine whether file is image or video
        if (mediaFile.type.startsWith("image/")) {
          postData.image_url = uploadedUrl;
          postData.video_url = null;
        } else if (mediaFile.type.startsWith("video/")) {
          postData.video_url = uploadedUrl;
          postData.image_url = null;
        }
      }

      await postsAPI.update(postId, postData);
      router.push(`/dashboard/posts/${postId}`);
    } catch (err) {
      setError("Failed to update post");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- END UPDATED FUNCTION ---

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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-xl w-full">
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Edit Post</h1>
            <Link href={`/dashboard/posts/${postId}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-lg shadow-md p-6">
            {error && (
              <div className="bg-destructive text-destructive-foreground p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            <PostForm
              initialData={post}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
