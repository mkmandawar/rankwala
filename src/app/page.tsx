"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

type ScoreResponse = {
  url: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  attempted: number;
  questions: number;
  rule: { correct: number; wrong: number; blank: number };
  sections?: {
    name: string;
    total: number;
    correct: number;
    wrong: number;
    blank: number;
    attempted: number;
    questions: number;
  }[];
  sectionsDetected?: { name: string; questions: number }[];
  meta?: {
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
  error?: string;
};

const categories = ["UR", "OBC", "EWS", "SC", "ST"];

const rrbZones = [
  "Ahmedabad",
  "Ajmer",
  "Allahabad",
  "Bangalore",
  "Bhopal",
  "Bhubaneswar",
  "Bilaspur",
  "Chandigarh",
  "Chennai",
  "Gorakhpur",
  "Guwahati",
  "Jammu-Srinagar",
  "Kolkata",
  "Malda",
  "Mumbai",
  "Muzaffarpur",
  "Patna",
  "Ranchi",
  "Secunderabad",
  "Siliguri",
  "Thiruvananthapuram",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [zone, setZone] = useState(rrbZones[0]);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const scorecardRef = useRef<HTMLDivElement | null>(null);
  const [headerImage, setHeaderImage] = useState<string | undefined>(undefined);

  const sectionsForCard =
    result?.sections?.length && result.sections.length > 0
      ? result.sections
      : result
        ? [
            {
              name: "Overall",
              questions: result.questions,
              attempted: result.attempted,
              correct: result.correct,
              wrong: result.wrong,
              blank: result.blank,
              total: result.total,
            },
          ]
        : [];

  const totalsRow = sectionsForCard.reduce(
    (acc, s) => {
      acc.questions += s.questions;
      acc.correct += s.correct;
      acc.wrong += s.wrong;
      acc.blank += s.blank;
      acc.total += s.total;
      acc.attempted += s.attempted;
      return acc;
    },
    { questions: 0, correct: 0, wrong: 0, blank: 0, total: 0, attempted: 0 },
  );

  const examLogos = useMemo(() => result?.meta?.examImages ?? [], [result?.meta?.examImages]);

  useEffect(() => {
    const first = examLogos[0];
    if (!first) {
      setHeaderImage(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(first)}`);
        if (!res.ok) throw new Error("fetch fail");
        const data = await res.json();
        if (!cancelled) setHeaderImage(data.dataUrl);
      } catch {
        if (!cancelled) setHeaderImage(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examLogos]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!url.trim()) {
      setError("Paste the answer-key URL first.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as ScoreResponse;

      if (!res.ok) {
        setError(data.error ?? "Unable to score this link.");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const statCard = (label: string, value: string | number, accent?: string) => (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );

  const showPreview = !!result || loading;

  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Which exams does Rankwala support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It works with official answer-key pages for RRB, SSC, and other exams that publish questions and chosen options in HTML.",
        },
      },
      {
        "@type": "Question",
        name: "How is the score calculated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Each correct answer gets +1, each wrong answer gets -1/3, and blanks are 0. Section-wise totals, right, wrong, and not-attempt counts are shown.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to upload files or sign in?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Paste the official answer-key URL, choose your category and (if needed) RRB zone, and the scorecard is generated instantly without login.",
        },
      },
    ],
  };

  const handleDownload = async () => {
    if (!scorecardRef.current) return;
    try {
      const domtoimage = await import("dom-to-image-more");
      const node = scorecardRef.current;
      const dataUrl = await domtoimage.toPng(node, {
        cacheBust: true,
        bgcolor: "#ffffff",
        quality: 1,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: {
          backgroundColor: "#ffffff",
        },
        imagePlaceholder:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "scorecard.png";
      a.click();
    } catch (err) {
      console.error("Download failed", err);
      alert(
        "Download failed because some remote images blocked CORS. The scorecard is still visible; please take a screenshot if this keeps happening.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-md backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 text-lg font-bold text-white shadow-lg">
                Rw
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Rankwala</p>
                <p className="text-sm font-semibold text-slate-900">Exam score helper</p>
              </div>
            </div>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-700 sm:flex">
              <a className="hover:text-sky-700" href="#calculator">
                Calculator
              </a>
              <a className="hover:text-sky-700" href="/how">
                How it works
              </a>
              <a className="hover:text-sky-700" href="#footer">
                Support
              </a>
            </nav>
            <a
              href="#calculator"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:brightness-110"
            >
              Get my score
            </a>
          </div>
        </header>
      </div>

      <section className="relative overflow-hidden pb-16" id="hero">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[6%] top-[12%] h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
          <div className="absolute right-[10%] top-[4%] h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
          <div className="absolute bottom-[-8%] left-[25%] h-64 w-64 rounded-full bg-indigo-100 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              ✅ Official-looking scorecards
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sky-700">
              🔒 Safe on your device
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
              ⚡ Instant results
            </span>
          </div>

          <div className="grid items-center gap-10">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                Built for students - no login needed
              </span>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Instant scorecards for RRB, SSC, and other exams.
              </h1>
              <p className="text-base text-slate-600">
                Paste the official answer-key link, pick your category and (if needed) RRB zone, and
                download a clean scorecard ready to share. Section-wise marks, attempts, and not-attempt
                counts are all included.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#calculator"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:brightness-110"
                >
                  Check my score
                </a>
                <p className="text-sm text-slate-600">Works with official answer-key pages (RRB, SSC, etc.).</p>
              </div>
              <div className="grid max-w-md grid-cols-2 gap-3">
                {statCard("RRB Zones", rrbZones.length, "text-sky-800")}
                {statCard("Categories", categories.length, "text-emerald-700")}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-slate-900">Supported exams</p>
                  <p>RRB Level 1, NTPC, SSC CGL, SSC GD, and any exam that shares HTML answer keys.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-slate-900">Scoring rule</p>
                  <p>Correct: +1 · Wrong: -1/3 · Blank: 0. Section-wise right, wrong, and not-attempt.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main id="calculator" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Score calculator</p>
          <h2 className="text-2xl font-semibold text-slate-900">Paste your answer-key link</h2>
          <p className="text-sm text-slate-600">
            We show your details, section scores, attempts, and not-attempt in one place.
          </p>
        </div>

        <section className={`grid gap-6 ${showPreview ? "lg:grid-cols-[1.05fr,0.95fr]" : ""}`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-800">Answer-key link</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-3 text-slate-400">🔗</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-9 py-3 text-base shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="https://.../E1.html"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Paste the full official link (ends with E1.html). No login or upload needed.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-800">Category</label>
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-800">RRB Zone</label>
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  >
                    {rrbZones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Scoring..." : "Get scorecard"}
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            {!result && !error && (
              <p className="mt-5 text-sm text-slate-500">
                Paste a link to see your marks, candidate details, and section-wise breakdown.
              </p>
            )}
          </div>

          {showPreview && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Scorecard preview</h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {loading ? "Scoring" : "Ready"}
              </span>
            </div>

            {loading && !result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {statCard("Total", "...", "text-slate-400")}
                  {statCard("Correct", "...", "text-slate-400")}
                  {statCard("Wrong", "...", "text-slate-400")}
                  {statCard("Blank", "...", "text-slate-400")}
                </div>
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Scoring your link...
                </div>
              </div>
            ) : result && !error ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {statCard("Total", result.total.toFixed(2), "text-sky-800")}
                  {statCard("Correct", result.correct, "text-emerald-700")}
                  {statCard("Wrong", result.wrong, "text-rose-700")}
                  {statCard("Blank", result.blank, "text-amber-700")}
                </div>
                <div
                  ref={scorecardRef}
                  className="scorecard-safe overflow-hidden rounded-[18px] border-[3px] border-red-600 bg-white shadow-md"
                >
                  <div className="bg-white px-4 pt-4">
                    {headerImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={headerImage}
                          alt="Exam logo"
                          className="max-h-28 w-full object-contain"
                        />
                      </>
                    ) : (
                      <div className="flex h-16 w-full items-center justify-center rounded-md border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
                        Exam Header
                      </div>
                    )}
                  </div>

                  <div className="px-4 pb-4">
                    <table className="scorecard-table w-full border-collapse text-sm">
                      <tbody>
                        {[
                          ["Registration Number", result.meta?.registration],
                          ["Roll Number", result.meta?.rollNumber],
                          ["Candidate Name", result.meta?.name],
                          ["Community", result.meta?.community],
                          ["Test Center Name", result.meta?.testCentre],
                          ["Exam Date", result.meta?.testDate],
                          ["Exam Time", result.meta?.testTime],
                          ["Subject", result.meta?.subject],
                        ].map(([label, value]) => (
                          <tr key={label}>
                            <td className="w-1/3 border border-red-500 px-3 py-2 font-semibold text-slate-800">
                              {label}
                            </td>
                            <td className="border border-red-500 px-3 py-2 break-words text-slate-900">
                              {value || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-4 overflow-hidden rounded-lg border border-red-600">
                      <table className="scorecard-table w-full border-collapse text-sm">
                        <thead className="bg-red-600 text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Section</th>
                            <th className="px-3 py-2 text-center">Total</th>
                            <th className="px-3 py-2 text-center">Right</th>
                            <th className="px-3 py-2 text-center">Wrong</th>
                            <th className="px-3 py-2 text-center">Not Attempt</th>
                            <th className="px-3 py-2 text-center">Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionsForCard.map((s) => (
                            <tr key={s.name} className="bg-white">
                              <td className="border border-red-600 px-3 py-2 break-words">{s.name}</td>
                              <td className="border border-red-600 px-3 py-2 text-center">
                                {s.questions}
                              </td>
                              <td className="border border-red-600 px-3 py-2 text-center text-emerald-700">
                                {s.correct}
                              </td>
                              <td className="border border-red-600 px-3 py-2 text-center text-rose-700">
                                {s.wrong}
                              </td>
                              <td className="border border-red-600 px-3 py-2 text-center text-slate-700">
                                {s.blank}
                              </td>
                              <td className="border border-red-600 px-3 py-2 text-center font-semibold">
                                {s.total.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-yellow-300 font-semibold">
                            <td className="border border-red-600 px-3 py-2">Total</td>
                            <td className="border border-red-600 px-3 py-2 text-center">
                              {totalsRow.questions}
                            </td>
                            <td className="border border-red-600 px-3 py-2 text-center text-emerald-800">
                              {totalsRow.correct}
                            </td>
                            <td className="border border-red-600 px-3 py-2 text-center text-rose-800">
                              {totalsRow.wrong}
                            </td>
                            <td className="border border-red-600 px-3 py-2 text-center text-slate-900">
                              {totalsRow.blank}
                            </td>
                            <td className="border border-red-600 px-3 py-2 text-center text-slate-900">
                              {totalsRow.total.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-800"
                  >
                    Download scorecard
                  </button>
                </div>
              </div>
            ) : (
              <></>
            )}
            </div>
          )}
        </section>
      </main>

      <footer
        id="footer"
        className="border-t border-slate-200 bg-white/80 py-6 backdrop-blur sm:py-8"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-600 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-700 text-base font-bold text-white shadow-md">
              Rw
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Rankwala</p>
              <p className="text-xs text-slate-500">Made for exam takers (RRB, SSC, more)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a className="hover:text-sky-700" href="#calculator">
              Calculator
            </a>
            <a className="hover:text-sky-700" href="#how">
              How it works
            </a>
            <span className="text-slate-500">support@rankwala.app</span>
          </div>
        </div>
      </footer>
      <Script id="faq-schema" type="application/ld+json">
        {JSON.stringify(faqJson)}
      </Script>
    </div>
  );
}
