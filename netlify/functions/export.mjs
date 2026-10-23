import { getStore } from "@netlify/blobs";
export const config = { path: "/api/export" };
const cell = (v) => { let s = Array.isArray(v) ? v.join(" | ") : String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
export default async (req) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || new URL(req.url).searchParams.get("token") !== token) return new Response("Unauthorized", { status: 401 });
  const store = getStore("ecc");
  const { blobs } = await store.list({ prefix: "attempts/" });
  const recs = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean)
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const cols = ["attemptId","name","email","score","percentage","completionStatus","secondsTaken","prizeEntryStatus","questionIds","submittedAnswers","correctAnswers","timestamp"];
  const csv = [cols.join(","), ...recs.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="equipment-control-results.csv"', "Cache-Control": "no-store" } });
};
