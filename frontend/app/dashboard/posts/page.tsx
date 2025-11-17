// app/dashboard/posts/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination"; // Pagination
import { postsAPI } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Post } from "@/types";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function PostsPage() {
  const user = useAuthStore((state) => state.user);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 9;

  // Load posts
  const loadPosts = useCallback(async (search?: string, page: number = 1) => {
    try {
      setIsLoading(true);

      const data = await postsAPI.getAll(search, page, postsPerPage);

      setPosts(data.posts);
      setTotalPages(Math.ceil(data.total / postsPerPage));
    } catch (err) {
      setError("Failed to load posts");
      console.error(err);
      setPosts([]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Fetch on load + when filters change
  useEffect(() => {
    loadPosts(searchQuery, currentPage);
  }, [currentPage, searchQuery, loadPosts]);

  // Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setIsSearching(true);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Pagination
  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await postsAPI.delete(id);
      await loadPosts(searchQuery, currentPage);
    } catch (err) {
      alert("Failed to delete post");
      console.error(err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <h1 className="text-2xl font-bold">Posts</h1>

              <div className="flex w-full gap-2 sm:w-auto">
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>

                <Link href="/dashboard/posts/create">
                  <Button>Create Post</Button>
                </Link>
              </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />

                <Input
                  type="text"
                  placeholder="Search posts by title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 rounded-lg bg-destructive p-4 text-destructive-foreground">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-lg text-muted-foreground">
                {searchQuery
                  ? `No posts found matching "${searchQuery}"`
                  : "No posts yet. Be the first to create one!"}
              </p>

              {searchQuery ? (
                <Button onClick={handleClearSearch}>Clear Search</Button>
              ) : (
                <Link href="/dashboard/posts/create">
                  <Button>Create Your First Post</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {searchQuery && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Found {posts.length} post(s) for “{searchQuery}”
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                    Clear
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                    isOwner={post.owner_id === user?.id}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
