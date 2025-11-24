// constants/index.ts
import { getEnv } from "@/lib/env";

export const APP_NAME = getEnv("NEXT_PUBLIC_APP_NAME", "Social Media App");
export const APP_DESCRIPTION = getEnv(
  "NEXT_PUBLIC_APP_DESCRIPTION",
  "Built with Next.js and FastAPI."
);
export const API_BASE_URL = getEnv(
  "NEXT_PUBLIC_API_BASE_URL",
  "http://localhost:8000"
);
export const SITE_URL = getEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
