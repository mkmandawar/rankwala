import { NextRequest, NextResponse } from "next/server";
import path from "path";
import puppeteer from "puppeteer";

export const dynamic = "force-dynamic";

export async function GET(
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
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    // Load from file:// so relative assets resolve correctly
    await page.goto(`file://${filePath}`, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: "A4",
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    await page.close();
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${requested.replace(/\\.html$/i, ".pdf")}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed", err);
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }
}
