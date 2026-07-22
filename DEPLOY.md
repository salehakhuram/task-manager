# Quick deploy checklist (TaskFlow)

Follow in order. You need free accounts for Atlas, Render, and Vercel.

## A. MongoDB Atlas (database)

1. https://cloud.mongodb.com → Create free M0 cluster
2. Database User + password
3. Network Access → `0.0.0.0/0`
4. Connect → copy `mongodb+srv://...` URI (database name `task-manager`)

## B. VAPID keys (desktop push)

```bash
cd server
npx web-push generate-vapid-keys
```

Save Public + Private keys for Render env.

## C. GitHub

1. Create a new empty GitHub repo
2. From project root:

```bash
git commit -m "Prepare TaskFlow for production deployment"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## D. Render (backend)

1. https://dashboard.render.com → New Web Service → connect GitHub repo
2. Root Directory: `server`
3. Build: `npm install` | Start: `npm start`
4. Plan: **Starter** (keeps `node-cron` alive; Free sleeps)
5. Env vars: see `server/.env.example` + README
6. After deploy, open `https://YOUR-API.onrender.com/api/health`

## E. Vercel (frontend)

1. https://vercel.com → Import GitHub repo
2. Root Directory: `client`
3. Env:
   - `VITE_API_URL=https://YOUR-API.onrender.com/api`
   - `VITE_SOCKET_URL=https://YOUR-API.onrender.com`
4. Deploy → copy frontend URL
5. Update Render `CLIENT_URL` to that URL → Redeploy API

## F. Verify

- Register/login
- CRUD tasks & meetings
- Calendar
- Allow notifications → reminder in 2–3 minutes
- Health endpoint OK

## CLI (optional frontend)

```bash
cd client
npx vercel login
npx vercel --prod
```
