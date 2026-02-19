import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type ParsedQuestion = {
  chosen?: string;
  correct?: string;
  status?: string;
  section?: string;
};

type Meta = {
  name?: string;
  rollNumber?: string;
  registration?: string;
  testCentre?: string;
  testDate?: string;
  testTime?: string;
  subject?: string;
  community?: string;
  examImages?: string[];
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; RankwalaBot/0.1; +https://rankwala.app)";

function normalizeOption(raw?: string) {
  if (!raw) return "";
  let cleaned = raw
    .replace(/option/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .trim()
    .toUpperCase();
  if (cleaned === "1") cleaned = "A";
  else if (cleaned === "2") cleaned = "B";
  else if (cleaned === "3") cleaned = "C";
  else if (cleaned === "4") cleaned = "D";
  return cleaned;
}

function parseFromText(text: string): ParsedQuestion[] {
  const blocks = text
    .split(/Question\s*(?:ID|No\.?)\s*[:\-]/i)
    .slice(1)
    .map((b) => b.trim());

  const parsed: ParsedQuestion[] = [];

  for (const block of blocks) {
    const chosen = block.match(/Chosen\s*Option\s*:\s*([A-Za-z0-9\-]+)/i)?.[1];
    const correct = block.match(/Correct\s*Option\s*:\s*([A-Za-z0-9\-]+)/i)?.[1];
    const status = block.match(/Status\s*:\s*([^\n\r]+)/i)?.[1];
    if (chosen || correct || status) {
      parsed.push({ chosen, correct, status });
    }
  }

  if (parsed.length > 0) return parsed;

  // Fallback: align sequential regex captures if blocks weren't detected.
  const chosenList = [...text.matchAll(/Chosen\s*Option\s*:\s*([A-Za-z0-9\-]+)/gi)];
  const correctList = [...text.matchAll(/Correct\s*Option\s*:\s*([A-Za-z0-9\-]+)/gi)];
  const statusList = [...text.matchAll(/Status\s*:\s*([^\n\r]+)/gi)];
  const count = Math.max(chosenList.length, correctList.length, statusList.length);

  for (let i = 0; i < count; i++) {
    parsed.push({
      chosen: chosenList[i]?.[1],
      correct: correctList[i]?.[1],
      status: statusList[i]?.[1],
    });
  }

  return parsed;
}

function parseFromTable($: cheerio.CheerioAPI): ParsedQuestion[] {
  const rows = $("tr");
  const parsed: ParsedQuestion[] = [];

  let chosenIdx = -1;
  let correctIdx = -1;
  let statusIdx = -1;

  rows.each((_, row) => {
    const cells = $(row)
      .find("th,td")
      .map((__, cell) => $(cell).text().trim())
      .get();
    if (cells.length === 0) return;

    const looksLikeHeader =
      chosenIdx === -1 &&
      cells.some((c) => /chosen/i.test(c)) &&
      cells.some((c) => /correct/i.test(c));

    if (looksLikeHeader) {
      chosenIdx = cells.findIndex((c) => /chosen/i.test(c));
      correctIdx = cells.findIndex((c) => /correct/i.test(c));
      statusIdx = cells.findIndex((c) => /status/i.test(c));
      return;
    }

    if (chosenIdx >= 0 && cells.length > Math.max(chosenIdx, correctIdx)) {
      parsed.push({
        chosen: cells[chosenIdx],
        correct: cells[correctIdx],
        status: statusIdx >= 0 ? cells[statusIdx] : undefined,
      });
    }
  });

  return parsed;
}

function optionTextToLetter(text: string) {
  const num = text.match(/^\s*([1-4])[\s.)-]/);
  if (num) {
    const idx = parseInt(num[1], 10) - 1;
    return ["A", "B", "C", "D"][idx] ?? "";
  }
  const letter = text.match(/^\s*([A-D])/i)?.[1];
  return letter ? letter.toUpperCase() : "";
}

function parseDomQuestions($: cheerio.CheerioAPI): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  $("div.question-pnl").each((_, el) => {
    const section = $(el)
      .closest(".section-cntnr")
      .find(".section-lbl .bold")
      .first()
      .text()
      .trim();

    const rightText = $(el).find(".rightAns").first().text().trim();
    const chosenText = $(el)
      .find("td.bold")
      .filter((__, td) => $(td).prev().text().includes("Chosen Option"))
      .first()
      .text()
      .trim();
    const status = $(el)
      .find("td.bold")
      .filter((__, td) => $(td).prev().text().includes("Status"))
      .first()
      .text()
      .trim()
      .toLowerCase();

    const correct = optionTextToLetter(rightText) || normalizeOption(rightText);
    const chosen =
      optionTextToLetter(chosenText) ||
      normalizeOption(chosenText) ||
      (chosenText === "--" ? "" : "");

    questions.push({ chosen, correct, status, section });
  });
  return questions;
}

function deriveSections($: cheerio.CheerioAPI): { name: string; count: number }[] {
  const sections: { name: string; count: number }[] = [];
  $(".section-cntnr").each((i, el) => {
    const name =
      $(el).find(".section-lbl .bold").first().text().trim() || `Section ${i + 1}`;
    const count = $(el).find(".question-pnl").length;
    if (count > 0) sections.push({ name, count });
  });
  return sections;
}

function assignSections(
  questions: ParsedQuestion[],
  sections: { name: string; count: number }[],
) {
  if (!sections.length || !questions.length) return questions;
  let idx = 0;
  for (const sec of sections) {
    for (let i = 0; i < sec.count && idx < questions.length; i++, idx++) {
      questions[idx] = { ...questions[idx], section: sec.name };
    }
  }
  // if any remaining without section, mark as "Overall"
  return questions.map((q) => ({ ...q, section: q.section ?? sections[0]?.name ?? "Overall" }));
}

function computeScore(questions: ParsedQuestion[]) {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  let correct = 0;
  let wrong = 0;
  let blank = 0;
  // Track score in thirds to avoid floating error (correct = +3, wrong = -1, blank = 0)
  let scoreThirds = 0;

  const perSection: Record<
    string,
    { correct: number; wrong: number; blank: number; thirds: number; questions: number }
  > = {};

  const addSection = (section: string, deltaThirds: number, kind: "correct" | "wrong" | "blank") => {
    perSection[section] ??= { correct: 0, wrong: 0, blank: 0, thirds: 0, questions: 0 };
    perSection[section][kind] += 1;
    perSection[section].thirds += deltaThirds;
    perSection[section].questions += 1;
  };

  for (const q of questions) {
    const chosen = normalizeOption(q.chosen);
    const correctOpt = normalizeOption(q.correct);
    const status = (q.status ?? "").toLowerCase();

    const isBlank =
      !chosen ||
      chosen === "--" ||
      status.includes("not answered") ||
      status.includes("not attempted") ||
      status.includes("unanswered");

    if (isBlank || !correctOpt) {
      blank += 1;
      if (q.section) addSection(q.section, 0, "blank");
      continue;
    }

    if (chosen === correctOpt) {
      correct += 1;
      scoreThirds += 3;
      if (q.section) addSection(q.section, 3, "correct");
    } else {
      wrong += 1;
      scoreThirds -= 1;
      if (q.section) addSection(q.section, -1, "wrong");
    }
  }

  return {
    total: round2(scoreThirds / 3),
    correct,
    wrong,
    blank,
    attempted: correct + wrong,
    questions: questions.length,
    sections: Object.entries(perSection).map(([name, s]) => ({
      name,
      total: round2(s.thirds / 3),
      correct: s.correct,
      wrong: s.wrong,
      blank: s.blank,
      attempted: s.correct + s.wrong,
      questions: s.questions,
    })),
  };
}

function extractMeta($: cheerio.CheerioAPI): Meta {
  const map: Record<string, keyof Omit<Meta, "examImages">> = {
    "registration number": "registration",
    "roll number": "rollNumber",
    "candidate name": "name",
    community: "community",
    "test center name": "testCentre",
    "test centre name": "testCentre",
    "test date": "testDate",
    "test time": "testTime",
    subject: "subject",
    subjects: "subject",
  };

  const meta: Meta = {};

  $("td").each((_, el) => {
    const key = $(el).text().trim();
    const normalized = key.toLowerCase();
    const target = map[normalized];
    if (!target) return;
    const value = $(el).next("td").text().trim();
    if (value) {
      meta[target] = value;
    }
  });

  return meta;
}

function extractExamImages($: cheerio.CheerioAPI): string[] {
  const seen = new Set<string>();
  const imgs: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    const absolute =
      src.startsWith("http") || src.startsWith("data:") ? src : src.startsWith("//") ? `https:${src}` : src;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    imgs.push(absolute);
  });
  return imgs.slice(0, 3);
}

function redactPersonalFields(html: string, meta?: Meta): string {
  const $ = cheerio.load(html);
  const labels = [
    "registration number",
    "roll number",
    "candidate name",
    "candidate",
    "community",
    "category",
    "test center name",
    "test centre name",
    "application number",
    "dob",
    "date of birth",
    "father name",
    "mother name",
  ];

  $("td, th").each((_, el) => {
    const key = $(el).text().trim().toLowerCase();
    const isPersonal = labels.some((l) => key.startsWith(l));
    const isDateTime = /test date|test time/.test(key);
    const isSubject = /subject|subjects/.test(key);

    if (isPersonal && !isDateTime && !isSubject) {
      const target = $(el).next("td");
      if (target.length) {
        target.text("[redacted]");
      }
      $(el).parent().remove();
    }
  });

  $("img").each((_, el) => {
    const src = ($(el).attr("src") || "").toLowerCase();
    const alt = ($(el).attr("alt") || "").toLowerCase();
    if (/photo|photograph|candidate|signature|sign/.test(src + alt)) {
      $(el).remove();
    }
  });

  let sanitized = $.html();

  // Also redact explicit meta values if present (safer for other layouts)
  if (meta) {
    Object.entries(meta).forEach(([key, val]) => {
      if (key === "examImages") return;
      // keep date, time, subject visible
      if (key === "testDate" || key === "testTime" || key === "subject") return;
      if (typeof val === "string" && val.trim().length > 2) {
        const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        sanitized = sanitized.replace(new RegExp(escaped, "g"), "[redacted]");
      }
    });
  }

  return sanitized;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function saveSanitizedCopy(html: string, url: string, meta?: Meta) {
  try {
    const sanitized = redactPersonalFields(html, meta);
    const dir = path.join(process.cwd(), "saved-keys");
    await fs.mkdir(dir, { recursive: true });
    const datePart = meta?.testDate ? slugify(meta.testDate) : "";
    const timePart = meta?.testTime ? slugify(meta.testTime) : "";
    const subjectPart = meta?.subject ? slugify(meta.subject) : "";
    const slug =
      subjectPart && datePart && timePart
        ? `exam-${subjectPart}-${datePart}-${timePart}`
        : `key-${crypto.createHash("sha256").update(url).digest("hex").slice(0, 12)}`;

    const filename = `${slug}.html`;
    const fullPath = path.join(dir, filename);

    // If already saved for same exam slot, skip to keep single copy
    try {
      await fs.access(fullPath);
      return;
    } catch {
      // not exists, proceed
    }

    await fs.writeFile(path.join(dir, filename), sanitized, "utf8");
  } catch (err) {
    console.error("Failed to save sanitized answer key", err);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "Missing `url` in request body." }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL must start with http or https." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed with status ${res.status}` },
        { status: res.status },
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $.root().text();
    const meta = { ...extractMeta($), examImages: extractExamImages($) };
    await saveSanitizedCopy(html, url, meta);
    const sectionsInfo = deriveSections($);

    // Prefer structured DOM parsing
    let questions = parseDomQuestions($);

    // Fallbacks if DOM parsing failed
    if (questions.length === 0) {
      questions = parseFromText(text);
    }
    if (questions.length === 0) {
      questions = parseFromTable($);
    }

    if (sectionsInfo.length) {
      questions = assignSections(questions, sectionsInfo);
    }

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not detect any questions in the provided page. Please upload the HTML or try another link.",
        },
        { status: 422 },
      );
    }

    const stats = computeScore(questions);

    return NextResponse.json({
      url,
      ...stats,
      sections: stats.sections,
      sectionsDetected: sectionsInfo.map((s) => ({ name: s.name, questions: s.count })),
      meta,
      rule: { correct: 1, wrong: -1 / 3, blank: 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /timeout/i.test(message) ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
