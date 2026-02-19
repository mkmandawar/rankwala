import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rankwala | Instant Scorecards for RRB, SSC and Other Exams",
  description:
    "Paste any official answer-key link (RRB, SSC, etc.), pick your category and zone, and download an official-looking scorecard with section-wise marks, attempts, and not-attempts.",
  keywords: [
    "RRB score calculator",
    "SSC answer key score",
    "exam scorecard download",
    "railway recruitment board marks",
    "section wise marks calculator",
    "negative marking 1/3",
    "rankwala",
  ],
  openGraph: {
    title: "Rankwala | Instant Scorecards for RRB, SSC and Other Exams",
    description:
      "Compute and download official-style scorecards from answer-key links in seconds. Supports RRB, SSC, and more.",
    url: "https://rankwala.app/",
    siteName: "Rankwala",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rankwala | Instant Scorecards for RRB, SSC and Other Exams",
    description:
      "Paste your answer-key URL, see section-wise marks, and download the scorecard as an image.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
