import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed ${res.status}` }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString("base64");
    return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
