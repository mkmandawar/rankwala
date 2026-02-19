import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const dir = path.join(process.cwd(), "saved-keys");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile() && e.name.endsWith(".html"));
    const stats = await Promise.all(
      files.map(async (file) => {
        const s = await fs.stat(path.join(dir, file.name));
        return {
          name: file.name,
          size: s.size,
          created: s.birthtime.toISOString(),
        };
      }),
    );
    stats.sort((a, b) => (a.created > b.created ? -1 : 1));
    return NextResponse.json({ files: stats });
  } catch {
    return NextResponse.json({ files: [], error: "Unable to read saved keys" }, { status: 200 });
  }
}
