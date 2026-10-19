import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, getCurrentUser } from "@/lib/db";
import { isSafePath, type FileMap } from "@/lib/files";

async function ownedProject(projectId: string) {
  const user = await getCurrentUser();
  return db.project.findFirst({ where: { id: projectId, ownerId: user.id } });
}

// Load files + version list
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  try {
    if (!(await ownedProject(projectId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows = await db.projectFile.findMany({ where: { projectId } });
    const versions = await db.version.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, createdAt: true },
      take: 50,
    });
    const files: FileMap = Object.fromEntries(rows.map((r: { path: string; content: string }) => [r.path, r.content]));
    return NextResponse.json({ files, versions });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

const Save = z.object({
  projectId: z.string(),
  files: z.record(z.string()),
  message: z.string().max(200).default("Manual save"),
});

// Save all files + create a Version checkpoint
export async function PUT(req: NextRequest) {
  const parsed = Save.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { projectId, files, message } = parsed.data;
  if (!Object.keys(files).every(isSafePath)) return NextResponse.json({ error: "Unsafe path" }, { status: 400 });
  try {
    if (!(await ownedProject(projectId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.$transaction([
      db.projectFile.deleteMany({ where: { projectId } }),
      db.projectFile.createMany({
        data: Object.entries(files).map(([path, content]) => ({ projectId, path, content })),
      }),
      db.version.create({ data: { projectId, message, snapshot: files } }),
      db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// Restore a version
export async function POST(req: NextRequest) {
  const { projectId, versionId } = await req.json();
  try {
    if (!(await ownedProject(projectId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const v = await db.version.findFirst({ where: { id: versionId, projectId } });
    if (!v) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    return NextResponse.json({ files: v.snapshot as FileMap });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
