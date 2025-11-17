// components/comments/comment-item.tsx
"use client";

import { Button } from "@/components/ui/button";
import { CommentWithUser } from "@/types";
import { useState } from "react";
import { CommentForm } from "./comment-form";

interface CommentItemProps {
  comment: CommentWithUser;
  isOwner: boolean;
  onUpdate: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

export function CommentItem({
  comment,
  isOwner,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUpdate = async (content: string) => {
    await onUpdate(comment.id, content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this comment?")) {
      await onDelete(comment.id);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-muted/50 rounded-lg p-4">
        <CommentForm
          onSubmit={handleUpdate}
          initialContent={comment.content}
          submitLabel="Save"
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">
            {comment.owner.full_name || comment.owner.email}
          </span>
          <span className="text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-muted-foreground italic text-xs">
              (edited)
            </span>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>
      <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
    </div>
  );
}
