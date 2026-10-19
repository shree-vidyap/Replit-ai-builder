import { PrismaClient } from "@prisma/client";

export const db: PrismaClient = (globalThis as any).prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") (globalThis as any).prisma = db;

/**
 * Phase 2 placeholder: returns a demo user so the app works before login exists.
 * Replace with the signed-in user from Auth.js / Clerk / Supabase Auth.
 */
export async function getCurrentUser() {
  return db.user.upsert({
    where: { email: "demo@ai-builder.local" },
    update: {},
    create: { email: "demo@ai-builder.local" },
  });
}
