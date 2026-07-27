# Deployment Update Guide — Stage 1 (Azure)

How to **ship an update** to the already-running Azure deployment. This is the
day-to-day "I changed code, get it live" runbook — not the first-time build-out
(that's [`DEPLOYMENT_AZURE.md`](DEPLOYMENT_AZURE.md)).

Everything lives in resource group **`ailab-rg`** (subscription = education
credits, first-party services only). Run `az login` before anything below.

---

## What's deployed (the map)

| Piece | Azure resource | Region | Notes |
|---|---|---|---|
| Backend web | Container App **`ailab-web`** | centralindia | Daphne/ASGI, external ingress, **port 8000** |
| Backend worker | Container App **`ailab-worker`** | centralindia | Celery, `CONTAINER_ROLE=worker` |
| Container env | **`ailab-env`** | centralindia | holds both apps |
| Image registry | ACR **`ailabacr2005`** | — | tags `v1, v2, …` — **built & pushed LOCALLY** |
| Frontend | Static Web App **`ailab-frontend`** | eastasia | Vite build, deployed with `swa` CLI |
| Database | Postgres Flexible **`ailab-pg-2005`** | centralindia | db `ailab`, user `ailabadmin` |
| Redis | Azure Managed Redis **`ailab-redis`** | centralindia | Balanced_B0, clustered |
| LLM | Azure OpenAI **`ailab-openai`** | koreacentral | deployment `gpt-4o-mini` |
| Sandbox | Dynamic Sessions **`ailab-sessions`** | eastasia | code execution |

> **Both backend apps run ONE image.** The role is chosen at runtime by the
> `CONTAINER_ROLE` env var (see the `CMD` in [`Stage1/backend/Dockerfile`](Stage1/backend/Dockerfile)):
> unset → web (Daphne), `worker` → Celery. So a backend update = build one image,
> push it, point **both** apps at the new tag.

---

## Prerequisites (local machine)

- **Azure CLI** — `az login`
- **Docker Desktop** running (images are built locally; `az acr build` /
  ACR Tasks are **blocked** on this subscription)
- **Node 18+** and the SWA CLI for frontend deploys: `npm i -g @azure/static-web-apps-cli`
- **Android Studio + JDK 21** only if you're shipping the Android app

Shared variables (PowerShell):

```powershell
$RG   = "ailab-rg"
$ACR  = "ailabacr2005"
$TAG  = "v5"          # <-- bump this every backend deploy (last was v4)
```

---

## 1. Backend update (code change → live)

Run from **`Stage1/backend`** (the Dockerfile lives there).

```powershell
cd Stage1/backend

# 1. Log the local Docker daemon into ACR
az acr login -n $ACR

# 2. Build the image locally and tag it for the registry
docker build -t "$ACR.azurecr.io/ailab-backend:$TAG" .

# 3. Push it
docker push "$ACR.azurecr.io/ailab-backend:$TAG"

# 4. Roll BOTH apps onto the new tag (each creates a new revision)
az containerapp update -g $RG -n ailab-web    --image "$ACR.azurecr.io/ailab-backend:$TAG"
az containerapp update -g $RG -n ailab-worker --image "$ACR.azurecr.io/ailab-backend:$TAG"

# 5. Confirm new revisions are Running
az containerapp revision list -g $RG -n ailab-web    -o table
az containerapp revision list -g $RG -n ailab-worker -o table
```

> **Always bump `$TAG`.** Reusing a tag (e.g. pushing `v4` again) means the
> Container App may not pull the new layers — the revision keeps the old image
> digest. A fresh tag guarantees the roll.

> Confirm the image name (`ailab-backend`) matches what the apps currently run:
> `az containerapp show -g $RG -n ailab-web --query "properties.template.containers[0].image" -o tsv`.
> Use whatever repository name that returns.

### Run migrations (only when models changed)

`collectstatic` runs at image-build time, but **migrations do not** (no DB at
build). After a schema change, apply them once against the shared Azure Postgres:

**Option A — exec into the running web container (recommended):**

```powershell
az containerapp exec -g $RG -n ailab-web --command "python manage.py migrate"
```

**Option B — from your laptop.** The local backend's `.env` already points
`DATABASE_URL` at the **same** Azure Postgres, so this hits the live DB:

```powershell
cd Stage1/backend
./venv/Scripts/python.exe manage.py migrate
```

> ⚠️ Both options write to the **production** database. There is no separate
> staging DB. Review the migration before running it.

---

## 2. Update an environment variable (e.g. CORS, keys)

Env changes create a new revision on their own — **no image rebuild needed.**

`CORS_ORIGINS` is a single comma-separated list, so setting it **replaces** the
whole value. Read the current value, append, write it back:

```powershell
# Read current CORS list
$cur = az containerapp show -g $RG -n ailab-web `
  --query "properties.template.containers[0].env[?name=='CORS_ORIGINS'].value" -o tsv

# Append a new origin and update (spawns a new revision)
az containerapp update -g $RG -n ailab-web `
  --set-env-vars "CORS_ORIGINS=$cur,https://your-new-origin"

# Verify
az containerapp revision list -g $RG -n ailab-web -o table
```

Set any other var the same way, e.g. rotating a key:

```powershell
az containerapp update -g $RG -n ailab-web `
  --set-env-vars "AZURE_OPENAI_API_KEY=<new-key>"
```

> Change env on **`ailab-worker`** too if the var matters to Celery (DB, Redis,
> LLM, sandbox endpoints). CORS is web-only.

---

## 3. Frontend update (Static Web Apps)

Run from **`Stage1/frontend`**. The build reads `.env.production`, whose
`VITE_API_URL` **must include the `/api/v1` suffix** (on `main`, `src/api.js`
uses it as the axios baseURL verbatim — drop the suffix and every `/auth/*` call
404s and you're stuck on the login page).

```powershell
cd Stage1/frontend
npm install            # only if deps changed
npm run build          # outputs dist/

# Get a deploy token and push the built folder
$TOKEN = az staticwebapp secrets list -g $RG -n ailab-frontend --query "properties.apiKey" -o tsv
swa deploy ./dist --deployment-token $TOKEN --env production
```

> **Hard-refresh / incognito** after deploying — the bundle hash changes and
> browsers cache aggressively. The current API URL is
> `https://ailab-web.livelycoast-44d6ca2d.centralindia.azurecontainerapps.io/api/v1`.

---

## 4. Android app update (Capacitor)

The app is a WebView wrap; it talks to the **Azure backend** (production build),
so no backend change is needed on-device — just rebuild the web bundle into the
native project. Full details in [`ANDROID_SETUP.md`](ANDROID_SETUP.md).

```powershell
cd Stage1/frontend
npm run cap:sync       # = vite build + cap sync android
npm run cap:open       # opens Android Studio
```

Then in Android Studio (bundled JDK 21): **Run ▶**, or **Build ▸ Build APK(s)** →
`android/app/build/outputs/apk/debug/app-debug.apk`.

> The WebView origin is `https://localhost` — it must be in `CORS_ORIGINS` on
> `ailab-web` (see section 2) or the app loads to a blank/login-stuck screen.
> If you changed the app icon/splash, regenerate first:
> `npx @capacitor/assets generate --android`.

---

## 5. Verify a deploy

- **Backend health:** `curl https://ailab-web.livelycoast-44d6ca2d.centralindia.azurecontainerapps.io/admin/`
  → 302 (up, DB reachable) and admin CSS loads (WhiteNoise + HTTPS OK).
- **App smoke:** open the SWA URL → guest login → Prediction Engine → **Run
  Model** returns a plot (sandbox OK) → Agentic Sandbox → **Test Pipeline**
  streams logs (Channels/Redis/Celery OK).
- **Worker:** `az containerapp logs show -g $RG -n ailab-worker --tail 50`
  should show Celery `ready` and task pickups.

---

## 6. Rollback

Revisions are immutable — roll back by reactivating the previous one (no rebuild):

```powershell
# List revisions, newest first
az containerapp revision list -g $RG -n ailab-web -o table

# Point 100% of traffic at the last-known-good revision
az containerapp ingress traffic set -g $RG -n ailab-web `
  --revision-weight <good-revision-name>=100
```

For the frontend, re-run `swa deploy` with a previous `dist/` (rebuild from the
prior commit). For env vars, just `--set-env-vars` back to the old value.

---

## Gotchas (learned the hard way — don't repeat)

- **ACR builds are local-only.** `az acr build` / ACR Tasks are blocked on this
  subscription. Always `docker build` locally → `docker push`.
- **Bump the image tag every time.** Reused tags don't reliably re-pull.
- **Clustered Redis** (`ailab-redis`) needs hash-tag key prefixes for
  Celery/Channels (`{ailab}` prefix) or you get MOVED/CROSSSLOT errors — already
  wired in settings; don't strip it.
- **Postgres firewall** currently has a temp allow-all rule (Container Apps
  egress isn't the env static IP). Hardening TODO: VNet integration.
- **GPT-5-family models** need `max_completion_tokens`, not `max_tokens`.
- **CV sandbox** needs a custom-container Dynamic Sessions pool
  (`AZURE_SESSION_POOL_ENDPOINT__CV_SANDBOX`); the default code-interpreter pool
  only covers regression/classification/neural_network.
- **`az` flag quirks:** `firewall-rule`/`db` subcommands use `--name` for the
  rule/db + `--server-name` for the server. `az containerapp ... --command`
  can't take dash-args — use `CONTAINER_ROLE` env for the worker role.
