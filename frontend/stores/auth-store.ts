import { authAPI } from "@/lib/api";
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Initial loading on startup
  isAuthenticated: false,

  // -------------------------
  // LOGIN
  // -------------------------
  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const data = await authAPI.login(email, password);

      localStorage.setItem("access_token", data.access_token);

      const user = await authAPI.getMe();

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Login error:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  // -------------------------
  // LOGOUT
  // -------------------------
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn("Logout API failed, clearing session anyway:", error);
    } finally {
      localStorage.removeItem("access_token");
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  // -------------------------
  // CHECK SESSION (on page load)
  // -------------------------
  fetchUser: async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true });

    try {
      const user = await authAPI.getMe();

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch user:", error);

      localStorage.removeItem("access_token");

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // -------------------------
  // SET USER MANUALLY (rarely used)
  // -------------------------
  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));
