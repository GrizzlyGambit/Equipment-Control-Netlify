# Equipment Control Challenge — Netlify version

Quiz page + 3 serverless functions:
- `/api/submit`      saves every attempt (scores are re-calculated on the server), updates the leaderboard, emails the organiser
- `/api/leaderboard` public top 10 (first name + last initial only, no emails)
- `/api/export?token=...` CSV of all attempts (organiser only)

## Deploy (Git — recommended)
1. Create a GitHub repo and push this folder's contents (keep the folder structure).
2. Netlify → Add new site → Import from Git → pick the repo. Build settings are read from `netlify.toml` (no build command).
3. Add environment variables (Site configuration → Environment variables):
   - `RESEND_API_KEY`  your key from resend.com (mark as secret)
   - `NOTIFY_EMAIL`    emmanuel.etsu@msc.com  (comma-separate for several people)
   - `FROM_EMAIL`      e.g. `Equipment Control <quiz@yourdomain.com>` (must be a Resend-verified domain)
   - `ADMIN_TOKEN`     a long random string, used for the CSV export
4. Trigger a redeploy so the variables take effect.

## Deploy (CLI)
```
npm i -g netlify-cli && npm install
netlify login && netlify init     # then: netlify deploy --prod
```
(Drag-and-drop on Netlify Drop will NOT run the functions.)

## Notes
- Resend: without a verified domain, the default sender (onboarding@resend.dev) can only deliver to your own Resend account email. Verify a domain to email anyone.
- View results: emails per play, or open `https://YOUR-SITE.netlify.app/api/export?token=YOUR_ADMIN_TOKEN` for a CSV.
- Set the quiz timer, attempts and rules placeholders in the CONFIG block of `public/index.html`. If you edit questions, update `netlify/lib/bank.mjs` to match (same IDs/correct answers).
- Attempt limits are per browser; the server stores one record per attempt ID. Add rate limiting (Netlify WAF) for large public events.
