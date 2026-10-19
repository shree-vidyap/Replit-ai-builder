import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, getCurrentUser } from "@/lib/db";
import { getTemplate } from "@/lib/templates";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const projects = await db.project.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, framework: true, updatedAt: true },
    });
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

const Body = z.object({ name: z.string().min(1).max(80), framework: z.string() });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const user = await getCurrentUser();
    const files = getTemplate(parsed.data.framework);
    const project = await db.project.create({
      data: {
        name: parsed.data.name,
        framework: parsed.data.framework,
        ownerId: user.id,
        files: { create: Object.entries(files).map(([path, content]) => ({ path, content })) },
        versions: { create: { message: "Initial template", snapshot: files } },
      },
    });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
