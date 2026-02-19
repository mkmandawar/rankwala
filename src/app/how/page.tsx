"use client";

import Link from "next/link";

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

export default function HowPage() {
  const statCard = (label: string, value: string | number, accent?: string) => (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 text-lg font-bold text-white shadow-lg">
              Rw
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Rankwala</p>
              <p className="text-sm font-semibold text-slate-900">Exam score helper</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:brightness-110"
          >
            Back to calculator
          </Link>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-10 top-10 h-44 w-44 rounded-full bg-sky-100 blur-3xl" />
            <div className="absolute right-10 bottom-10 h-48 w-48 rounded-full bg-indigo-100 blur-3xl" />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-5">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">How Rankwala works</h1>
              <p className="text-base text-slate-600">
                We turn the official answer-key pages (RRB, SSC, and others) into a clean, shareable scorecard.
                Your marks and section-wise breakup stay on your device.
              </p>
              <ol className="space-y-3 text-sm text-slate-700">
                <li>1) Paste your answer-key URL (ends with E1.html).</li>
                <li>2) Pick your category (UR / OBC / EWS / SC / ST) and RRB zone if applicable.</li>
                <li>3) We read the key, match your chosen options, and compute +1 / -1/3 per question.</li>
                <li>4) See section-wise right, wrong, not-attempt, and total marks.</li>
                <li>5) Download the scorecard image that looks like the official format.</li>
              </ol>
              <div className="grid max-w-md grid-cols-2 gap-3">
                {statCard("RRB Zones", rrbZones.length, "text-sky-800")}
                {statCard("Categories", categories.length, "text-emerald-700")}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Why trust it?</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Works directly from official answer-key HTML, no manual uploads.</li>
                <li>• No sign-up; calculations stay in your session.</li>
                <li>• Section-wise transparency: right, wrong, not attempted, and marks.</li>
                <li>• Download as an image that matches the official look.</li>
              </ul>
              <div className="rounded-xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                Tip: If a link is geo-blocked, save the HTML and run Rankwala locally with that file URL.
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:brightness-110"
              >
                Open calculator
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

