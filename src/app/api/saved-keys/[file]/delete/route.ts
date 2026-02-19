import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file: requested } = await params;
  const allowed =
    /^key-[a-f0-9]{12}(?:-\d+)?\.html$/i.test(requested) ||
    /^exam-[a-z0-9-]+\.html$/.test(requested);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const dir = path.join(process.cwd(), "saved-keys");
  const filePath = path.join(dir, requested);
  try {
    await fs.unlink(filePath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 404 });
  }
}
