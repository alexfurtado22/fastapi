// lib/env.ts
export function getEnv(
  key: keyof NodeJS.ProcessEnv,
  fallback?: string
): string {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing environment variable: ${key}`);
}
