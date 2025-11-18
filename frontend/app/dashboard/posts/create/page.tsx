// app/(dashboard)/dashboard/posts/create/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PostForm } from "@/components/posts/post-form";
import { Button } from "@/components/ui/button";

import { postsAPI } from "@/lib/api";
import { uploadFile } from "@/lib/upload";

// Matches PostForm schema
type FormValues = {
  title: string;
  content: string;
  image_url?: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- UPDATED SUBMIT FUNCTION ---
  const handleSubmit = async (data: FormValues, mediaFile: File | null) => {
    try {
      setError("");
      setIsSubmitting(true);

      // 1. Base payload
      const postData: {
        title: string;
        content: string;
        image_url?: string | null;
        video_url?: string | null;
      } = {
        title: data.title,
        content: data.content,
        image_url: data.image_url,
        video_url: null,
      };

      // 2. Upload file if exists
      if (mediaFile) {
        let uploadedUrl: string;

        try {
          uploadedUrl = await uploadFile(mediaFile);
        } catch {
          setError("Failed to upload file");
          setIsSubmitting(false);
          return;
        }

        // 3. Pick correct field
        if (mediaFile.type.startsWith("image/")) {
          postData.image_url = uploadedUrl;
          postData.video_url = null;
        } else if (mediaFile.type.startsWith("video/")) {
          postData.video_url = uploadedUrl;
          postData.image_url = null;
        }
      }

      // 4. Create post
      await postsAPI.create(postData);
      router.push("/dashboard/posts");
    } catch (err) {
      console.error(err);
      setError("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- END UPDATED FUNCTION ---

  return (
    <ProtectedRoute>
      <div className="col-span-2">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b ">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold">Create Post</h1>
            <Link href="/dashboard/posts">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-card p-6 shadow-md">
            {error && (
              <div className="mb-6 rounded-lg bg-destructive p-4 text-destructive-foreground">
                {error}
              </div>
            )}

            <PostForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
