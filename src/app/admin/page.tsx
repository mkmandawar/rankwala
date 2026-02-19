import fs from "fs/promises";
import path from "path";
import Link from "next/link";

type SavedKey = {
  name: string;
  sizeKB: number;
  created: string;
};

async function loadKeys(): Promise<SavedKey[]> {
  const dir = path.join(process.cwd(), "saved-keys");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile() && e.name.endsWith(".html"));
    const stats = await Promise.all(
      files.map(async (file) => {
        const s = await fs.stat(path.join(dir, file.name));
        return {
          name: file.name,
          sizeKB: Math.max(1, Math.round(s.size / 1024)),
          created: s.birthtime.toISOString(),
        };
      }),
    );
    return stats.sort((a, b) => (a.created > b.created ? -1 : 1));
  } catch (err) {
    console.error("Failed to load saved keys", err);
    return [];
  }
}

export default async function AdminKeysPage() {
  const keys = await loadKeys();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Admin</p>
            <h1 className="text-2xl font-semibold text-slate-900">Saved answer keys (sanitized)</h1>
            <p className="text-sm text-slate-600">
              Original structure kept, candidate details removed. Click download to review.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:brightness-110"
          >
            Back to calculator
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Filename</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Created (UTC)</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Size (KB)</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      No saved answer keys yet.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.name} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-800">
                        {key.name}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {key.created.replace("T", " ").replace("Z", "")}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{key.sizeKB}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <a
                          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-sky-700"
                          href={`/api/saved-keys/${encodeURIComponent(key.name)}`}
                          download
                        >
                          Download HTML
                        </a>
                        <form
                          action={`/api/saved-keys/${encodeURIComponent(key.name)}/delete`}
                          method="post"
                          className="mt-2 inline-block"
                        >
                          <button
                            type="submit"
                            className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-rose-700"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
