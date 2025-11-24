// lib/api.ts
import { CommentWithUser, Post, PostWithDetails } from "@/types";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Axios instance
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { access_token } = response.data;
        localStorage.setItem("access_token", access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// =======================
// AUTH API
// =======================
export const authAPI = {
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return response.data;
  },

  async register(email: string, password: string, fullName: string) {
    const response = await api.post("/auth/register", {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  async logout() {
    await api.post("/auth/logout");
    localStorage.removeItem("access_token");
  },

  async getMe() {
    const response = await api.get("/users/me");
    return response.data;
  },

  async updateProfile(data: { full_name?: string; email?: string }) {
    const response = await api.patch("/users/me", data);
    return response.data;
  },
};

// =======================
// POSTS API
// =======================
export interface PaginatedPosts {
  total: number;
  posts: Post[];
}

// 👇 Your new type for better safety
export interface ToggleLikeResponse {
  status: "liked" | "unliked";
}

export const postsAPI = {
  async getAll(
    search: string = "",
    page: number = 1,
    limit: number = 9
  ): Promise<PaginatedPosts> {
    const params = new URLSearchParams();
    const skip = (page - 1) * limit;

    params.append("skip", String(skip));
    params.append("limit", String(limit));

    if (search) {
      params.append("search", search);
    }

    const response = await api.get(`/posts?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<PostWithDetails> {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  async create(data: {
    title: string;
    content?: string;
    image_url?: string | null;
    video_url?: string | null;
  }) {
    const response = await api.post("/posts", data);
    return response.data;
  },

  async update(
    id: number,
    data: {
      title?: string;
      content?: string;
      image_url?: string | null;
      video_url?: string | null;
    }
  ) {
    const response = await api.patch(`/posts/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/posts/${id}`);
  },
  // 👇 UPDATED: Added return type annotation
  async toggleLike(postId: number): Promise<ToggleLikeResponse> {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },
};

// =======================
// COMMENTS API
// =======================
export const commentsAPI = {
  async create(postId: number, content: string): Promise<CommentWithUser> {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  async update(commentId: number, content: string): Promise<CommentWithUser> {
    const response = await api.patch(`/comments/${commentId}`, { content });
    return response.data;
  },

  async delete(commentId: number) {
    await api.delete(`/comments/${commentId}`);
  },
};
