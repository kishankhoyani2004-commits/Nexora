# Deploying Nexora for free

Stack: Vite/React frontend → **Vercel**, Express/Socket.io backend → **Render** (free web service), database → **MongoDB Atlas** (free M0 cluster). No credit card required for any of the three.

All three accounts/steps below have to be done by you in your browser — I can't create accounts or enter payment/API details on your behalf. This doc is the checklist.

## 1. MongoDB Atlas (database)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (free tier, no card).
2. Create a free **M0** cluster (any region close to you).
3. **Database Access** → add a database user with a username/password (save these — they go in the connection string).
4. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Render's IPs aren't static on the free plan).
5. **Connect → Drivers** → copy the connection string, e.g.:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/nexora?retryWrites=true&w=majority`
   Replace `<user>`/`<password>` and make sure the database name is `nexora` (or whatever you want).

## 2. Render (backend)

1. Sign up at [render.com](https://render.com) with your GitHub account.
2. **New +** → **Blueprint** → pick your `Nexora` repo. Render will read [render.yaml](render.yaml) at the repo root and pre-fill a free web service (`nexora-backend`, root dir `backend`, `npm install` / `node server.js`).
3. It will prompt you to fill in the env vars marked `sync: false`. At minimum set:
   - `MONGO_URI` — the Atlas connection string from step 1
   - `CLIENT_URL` — your future Vercel URL (you can add this after step 3 below and redeploy)
   - `BACKEND_URL` — leave blank for now, fill in once Render gives you the service URL
   - `JWT_SECRET` — Render can auto-generate this (already configured)
4. The rest (`SMTP_*`, `GOOGLE_CLIENT_*`, `CLOUDINARY_*`, `STRIPE_*`, `GEMINI_API_KEY`) are optional — the app degrades gracefully without them (mock payments, local file storage instead of Cloudinary, no Google OAuth button, offline AI assistant fallback). Leave blank for now if you don't have accounts for those.
5. Deploy. Once live, copy the service URL, e.g. `https://nexora-backend.onrender.com`.

**Free-tier note:** Render free web services spin down after 15 minutes of inactivity — the first request after idle takes ~30–50s to wake up. Fine for a college demo; mention it if a grader hits a cold start.

## 3. Vercel (frontend)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project** → import the `Nexora` repo.
3. Framework preset: **Vite**. Root directory: repo root (leave default). Build command `npm run build`, output directory `dist` (Vercel auto-detects these for Vite).
4. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://nexora-backend.onrender.com/api` (your Render URL from step 2, with `/api` appended)
5. Deploy. Vercel gives you a URL like `https://nexora.vercel.app`.

## 4. Wire the two together

1. Back in Render → your backend service → Environment → set `CLIENT_URL` and `BACKEND_URL` to the real Vercel/Render URLs from steps 2–3, then trigger a manual redeploy (CORS and Socket.io both check `CLIENT_URL`).
2. Reload the Vercel site and confirm login/signup and the dashboard load real data.

## 5. Optional integrations (skip for now if you just need it "live")

| Feature | Env vars | Without it |
|---|---|---|
| File/avatar uploads persisted (not lost on redeploy) | `CLOUDINARY_*` (free tier at [cloudinary.com](https://cloudinary.com)) | Falls back to local disk, which Render's free tier wipes on every redeploy |
| Password-reset / notification emails | `SMTP_*` (a Gmail address + [App Password](https://myaccount.google.com/apppasswords)) | Email sending silently no-ops |
| Google sign-in | `GOOGLE_CLIENT_ID`/`SECRET` from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Google button hidden/disabled |
| Real payments | `STRIPE_*` test keys from [dashboard.stripe.com](https://dashboard.stripe.com/test/apikeys) | Runs in mock/simulated payment mode |
| AI Assistant using Gemini | `GEMINI_API_KEY` (free tier at [aistudio.google.com](https://aistudio.google.com/apikey)) | Falls back to a local rule-based assistant |

## Troubleshooting

- **CORS errors in the browser console** → `CLIENT_URL` on Render doesn't match the Vercel URL exactly (check `https://` and no trailing slash).
- **Login works but sockets/chat don't connect** → same `CLIENT_URL` mismatch, or the Render free instance is asleep (wait ~30s and retry).
- **"Network Error" on every request** → `VITE_API_BASE_URL` on Vercel is missing the `/api` suffix or points at the wrong Render URL.
