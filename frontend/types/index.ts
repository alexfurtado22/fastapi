// types/index.ts

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
}

export interface Post {
  id: number;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  user_has_liked: boolean;
}

export interface PostWithDetails extends Post {
  owner: User;
  comments: CommentWithUser[];
}

export interface Comment {
  id: number;
  content: string;
  owner_id: string;
  post_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentData {
  content: string;
}

export interface UpdateCommentData {
  content?: string;
}

export interface CommentWithUser extends Comment {
  owner: User;
}

export interface CreatePostData {
  title: string;
  content?: string;
  image_url?: string;
  video_url?: string;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  image_url?: string;
  video_url?: string;
}
