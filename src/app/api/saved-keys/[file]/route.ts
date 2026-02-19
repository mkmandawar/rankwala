import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file: requested } = await params;
  // Basic allow-list: only our generated filenames.
  const allowed =
    /^key-[a-f0-9]{12}(?:-\d+)?\.html$/i.test(requested) ||
    /^exam-[a-z0-9-]+\.html$/.test(requested);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dir = path.join(process.cwd(), "saved-keys");
  const filePath = path.join(dir, requested);

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${requested}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
