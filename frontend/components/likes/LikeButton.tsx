"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LikeButtonProps {
  postId: number;
  initialLikesCount: number;
  initialUserHasLiked: boolean;
  onLikeToggle?: (postId: number, newLikeState: boolean) => void;
}

export default function LikeButton({
  postId,
  initialLikesCount,
  initialUserHasLiked,
  onLikeToggle,
}: LikeButtonProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [userHasLiked, setUserHasLiked] = useState(initialUserHasLiked);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    // Optimistic update
    const previousLikesCount = likesCount;
    const previousUserHasLiked = userHasLiked;

    setUserHasLiked(!userHasLiked);
    setLikesCount(userHasLiked ? likesCount - 1 : likesCount + 1);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/posts/${postId}/like`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();

        // Handle specific errors
        if (response.status === 400) {
          toast.error("Cannot like post", {
            description: error.detail || "You cannot like your own post",
          });
        } else if (response.status === 401) {
          toast.error("Authentication required", {
            description: "Please login to like posts",
          });
        } else {
          throw new Error(error.detail || "Failed to toggle like");
        }

        // Revert optimistic update
        setUserHasLiked(previousUserHasLiked);
        setLikesCount(previousLikesCount);
        return;
      }

      const data = await response.json();

      // Show success toast
      if (data.status === "liked") {
        toast.success("Post liked! ❤️");
      }

      // Optional callback for parent component
      if (onLikeToggle) {
        onLikeToggle(postId, data.status === "liked");
      }
    } catch (error) {
      console.error("Error toggling like:", error);

      toast.error("Failed to update like status", {
        description: "Please try again",
      });

      // Revert optimistic update on error
      setUserHasLiked(previousUserHasLiked);
      setLikesCount(previousLikesCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={userHasLiked ? "default" : "outline"}
      size="default"
      onClick={handleLike}
      disabled={isLoading}
      className={cn(
        "gap-2 transition-all",
        userHasLiked && "bg-red-500 hover:bg-red-600 border-red-500"
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          userHasLiked ? "fill-current" : "fill-none"
        )}
      />
      <span className="font-medium">{likesCount}</span>
    </Button>
  );
}
