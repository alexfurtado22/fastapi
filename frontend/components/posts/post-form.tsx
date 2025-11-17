// components/posts/post-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Post } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";

// 1. ZOD SCHEMA
const formSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long.",
  }),
  content: z.string().min(10, {
    message: "Content must be at least 10 characters long.",
  }),
  image_url: z
    .string()
    .url({ message: "Must be a valid URL." })
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// 2. COMPONENT PROPS
interface PostFormProps {
  initialData?: Post;
  onSubmit: (data: FormValues, mediaFile: File | null) => void;
  isSubmitting?: boolean;
}

export function PostForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: PostFormProps) {
  const isEditMode = !!initialData;

  // 3. REACT-HOOK-FORM SETUP
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      image_url: initialData?.image_url || "",
    },
  });

  // 4. STATE
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(
    initialData?.image_url || initialData?.video_url || null
  );

  // 5. HANDLERS
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    form.setValue("image_url", "", { shouldValidate: true });

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    form.setValue("image_url", "", { shouldValidate: true });
  };

  // 6. FORM SUBMISSION
  const handleSubmit = (data: FormValues) => {
    onSubmit(data, mediaFile);
  };

  // 7. PREVIEW TYPE LOGIC
  const getPreviewType = () => {
    if (mediaFile) {
      return mediaFile.type.startsWith("video/") ? "video" : "image";
    }

    if (mediaPreview) {
      if (mediaPreview.match(/\.(mp4|webm|mov|mkv)$/i)) {
        return "video";
      }
    }

    return "image";
  };

  const previewType = getPreviewType();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* --- TITLE --- */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Post title..."
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- CONTENT --- */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write something..."
                  disabled={isSubmitting}
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- MEDIA SECTION --- */}
        <div className="space-y-2">
          <Label>Media (Image or Video)</Label>

          {/* Preview */}
          {mediaPreview && (
            <div className="relative w-full h-64 overflow-hidden rounded-md bg-muted">
              {previewType === "video" ? (
                <video
                  src={mediaPreview}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={removeMedia}
                disabled={isSubmitting}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive p-2 text-destructive-foreground text-xs hover:bg-destructive/90"
              >
                ✕
              </button>
            </div>
          )}

          {/* File Input */}
          <Input
            id="media-file"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="file:text-foreground"
          />

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or paste media URL
              </span>
            </div>
          </div>

          {/* URL INPUT */}
          <FormField
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg or video.mp4"
                    disabled={isSubmitting}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      const url = e.target.value;

                      if (url) {
                        setMediaPreview(url);
                        setMediaFile(null);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting
            ? "Saving..."
            : isEditMode
            ? "Save Changes"
            : "Create Post"}
        </Button>
      </form>
    </Form>
  );
}
