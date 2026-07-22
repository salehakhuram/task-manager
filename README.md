# TaskFlow — MERN Task Manager

Full-stack task and meeting manager built with **MongoDB**, **Express**, **React**, **Node.js**, **Tailwind CSS**, **Socket.IO**, **node-cron**, and **Web Push**.

## Live URLs

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://taskflow-one-beta.vercel.app |
| Backend (Render) | _Pending — needs MongoDB Atlas URI_ |
| Database | MongoDB Atlas (_pending_) |

> Frontend is deployed. Set `VITE_API_URL` / `VITE_SOCKET_URL` after the Render API is live, then redeploy the client.

## Features

- JWT + bcrypt authentication
- Dashboard, tasks, meetings, interactive calendar
- Reminders with desktop notifications (Web Notification API + Web Push)
- Real-time updates via Socket.IO
- Scheduled reminder checks with `node-cron` (every minute on the backend)
- Dark / light mode

## Project structure

```
Task Manager/
├── client/          # React + Vite + Tailwind → deploy to Vercel
├── server/          # Express API → deploy to Render
├── render.yaml      # Render Blueprint
├── .env.example     # Overview of env vars
└── README.md
```

---

## Local development

### Prerequisites

- Node.js 18+
- MongoDB locally **or** MongoDB Atlas URI

### Install

```bash
cd server && npm install
cd ../client && npm install
```

### Environment

Copy examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Server `server/.env` (local):**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/task-manager
JWT_SECRET=dev_secret_change_me
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:dev@localhost
```

Generate VAPID keys:

```bash
cd server
npx web-push generate-vapid-keys
```

**Client `client/.env` (local):**

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Run

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open http://localhost:5173

---

## Production deployment

### 1) MongoDB Atlas

1. Create a free cluster at [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → create user + password
3. **Network Access** → allow `0.0.0.0/0` (or Render IPs)
4. **Connect** → Drivers → copy URI, replace `<password>`, set DB name `task-manager`:

```text
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/task-manager?retryWrites=true&w=majority
```

### 2) Backend → Render

1. Push this repo to GitHub
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
3. Connect the repo
4. Settings:

| Setting | Value |
|---------|--------|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance | **Starter** (recommended so the service does not sleep; free tier sleeps and pauses `node-cron`) |
| Health Check Path | `/api/health` |

5. **Environment** variables on Render:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas URI |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | your Vercel URL (e.g. `https://xxx.vercel.app`) — add preview URLs comma-separated if needed |
| `VAPID_PUBLIC_KEY` | from `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | matching private key |
| `VAPID_SUBJECT` | `mailto:you@example.com` |

6. Deploy → note the URL: `https://YOUR-SERVICE.onrender.com`  
7. Confirm health: `https://YOUR-SERVICE.onrender.com/api/health`

**Reminders / `node-cron`:** the scheduler starts with the Node process and runs every minute. Keep the Render service **always on** (Starter plan or higher, or ping `/api/health` every few minutes with UptimeRobot if you must use Free).

You can also deploy via Blueprint: `render.yaml` at the repo root.

### 3) Frontend → Vercel

1. [Vercel](https://vercel.com) → **Add New Project** → import the GitHub repo
2. Configure:

| Setting | Value |
|---------|--------|
| Root Directory | `client` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. **Environment Variables** (Production):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://YOUR-SERVICE.onrender.com` |

4. Deploy → note the URL: `https://YOUR-APP.vercel.app`
5. Go back to Render and set `CLIENT_URL` to that Vercel URL, then **redeploy** the API (CORS + Socket.IO need the final frontend origin).

### 4) Verify production checklist

- [ ] Register / login works
- [ ] Create / edit / delete tasks and meetings
- [ ] Calendar month/week/day loads events
- [ ] Allow browser notifications
- [ ] Create a task with reminder a few minutes ahead → desktop + in-app toast
- [ ] Socket reconnect delivers missed reminders
- [ ] `/api/health` returns success

### CLI alternative (frontend)

```bash
cd client
npx vercel login
npx vercel --prod
```

Set `VITE_API_URL` and `VITE_SOCKET_URL` in the Vercel project settings before production build.

---

## Environment variables (summary)

See also:

- [`.env.example`](./.env.example)
- [`server/.env.example`](./server/.env.example)
- [`client/.env.example`](./client/.env.example)

**Never commit real `.env` files.**

---

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/tasks` | List / create tasks |
| GET/POST | `/api/meetings` | List / create meetings |
| GET | `/api/dashboard` | Dashboard |
| GET | `/api/dashboard/calendar` | Calendar events |
| GET | `/api/notifications` | Notifications |
| GET | `/api/push/vapid-public-key` | Web Push public key |

Protected routes require `Authorization: Bearer <token>`.

---

## Socket.IO & desktop notifications

- Client connects to `VITE_SOCKET_URL` with JWT in `auth.token`
- Server emits `reminder` events; cron marks each reminder sent once
- Undelivered reminders flush on reconnect
- Web Push delivers desktop alerts when the tab is closed (browser may still need to be running)
