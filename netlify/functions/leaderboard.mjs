import { getStore } from "@netlify/blobs";
export const config = { path: "/api/leaderboard" };
export default async () => {
  const store = getStore("ecc");
  const { blobs } = await store.list({ prefix: "leaderboard/" });
  const rows = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean)
    .sort((a, b) => b.score - a.score || a.secs - b.secs || String(a.ts).localeCompare(String(b.ts)))
    .slice(0, 10).map(({ name, score, secs }) => ({ name, score, secs }));
  return new Response(JSON.stringify({ rows }), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=10" } });
};
