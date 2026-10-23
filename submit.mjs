import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import ANSWERS from "../lib/bank.mjs";

export const config = { path: "/api/submit" };

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const clean = (v, n) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, n);
const short = (n) => { const w = n.split(/\s+/); return (w[0] + (w.length > 1 ? " " + w[w.length - 1][0].toUpperCase() + "." : "")).slice(0, 30); };
const STATUSES = ["completed", "ended_early", "timed_out"];

async function sendMail(subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "Equipment Control Challenge <onboarding@resend.dev>",
        to: (process.env.NOTIFY_EMAIL || "emmanuel.etsu@msc.com").split(",").map((s) => s.trim()),
        subject, text,
      }),
    });
    return r.ok;
  } catch { return false; }
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), id = clean(b.attemptId, 40);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !/^[A-Za-z0-9]{6,40}$/.test(id)) return json({ error: "Invalid details" }, 400);

  const store = getStore("ecc"), key = "attempts/" + id;
  const existing = await store.get(key, { type: "json" });

  if (b.type === "enter") {
    if (!existing || existing.email !== email) return json({ error: "Attempt not found" }, 404);
    if (existing.prizeEntryStatus === "submitted") return json({ ok: true, duplicate: true });
    existing.prizeEntryStatus = "submitted"; existing.enteredAt = new Date().toISOString();
    await store.setJSON(key, existing);
    await sendMail("Prize entry submitted: " + existing.name,
      `A player confirmed their prize entry.\n\nName: ${existing.name}\nEmail: ${existing.email}\nScore: ${existing.score}/10 (${existing.percentage}%)\nAttempt ID: ${id}\nEntered: ${existing.enteredAt}`);
    return json({ ok: true });
  }

  if (existing) return json({ ok: true, duplicate: true }); // one record per attempt
  const qids = b.qids, ans = b.answers;
  if (!Array.isArray(qids) || qids.length !== 10 || new Set(qids).size !== 10 || !qids.every((q) => ANSWERS[q]) ||
      !Array.isArray(ans) || ans.length !== 10 || !ans.every((a) => a === null || (typeof a === "string" && a.length < 300)))
    return json({ error: "Invalid attempt" }, 400);
  const status = STATUSES.includes(b.status) ? b.status : "completed";
  const secs = Math.max(0, Math.min(86400, Math.round(Number(b.secs) || 0)));
  const correct = qids.map((q) => ANSWERS[q]);
  const score = ans.filter((a, i) => a === correct[i]).length, pct = score * 10;
  const ts = new Date().toISOString();

  await store.setJSON(key, { attemptId: id, name, email, score, percentage: pct, completionStatus: status, secondsTaken: secs,
    questionIds: qids, submittedAnswers: ans, correctAnswers: correct, timestamp: ts, prizeEntryStatus: "not_submitted" });

  const lk = "leaderboard/" + createHash("sha256").update(email).digest("hex").slice(0, 32);
  const cur = await store.get(lk, { type: "json" });
  if (!cur || score > cur.score || (score === cur.score && secs < cur.secs))
    await store.setJSON(lk, { name: b.show ? short(name) : "Anonymous player", score, secs, ts });

  const emailed = await sendMail(`Equipment Control Challenge: ${name} scored ${score}/10`,
    `Someone just played the Equipment Control Challenge.\n\nName: ${name}\nEmail: ${email}\nScore: ${score}/10 (${pct}%)\nStatus: ${status}\nTime taken: ${secs}s\nAttempt ID: ${id}\nPlayed: ${ts}\nPrize entry: not yet submitted`);
  return json({ ok: true, score, emailed });
};
