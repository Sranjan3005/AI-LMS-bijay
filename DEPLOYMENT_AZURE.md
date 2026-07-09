# Azure Deployment Runbook — AI Learning Platform (Stage 1)

This guide deploys the platform on Azure using your **education sponsorship credits**
(first-party services only, no reservations, consumption/PAYG pricing).

There are **two tracks**. Read the decision first — it saves you days.

---

## The one thing that decides your architecture: the sandbox

`core/sandbox.py` runs student code with:

```python
subprocess.run(['docker', 'run', '--rm', '-v', f'{run_dir.as_posix()}:/app/data', ...])
```

That needs a **real Docker daemon** *and* the `-v` host path to exist on the machine
running the command. This rules out plain PaaS (App Service / vanilla Container Apps),
because the `-v` volume is resolved by the host daemon, not the container.

So:

| Track | How the sandbox runs | Code changes | Use when |
|-------|----------------------|--------------|----------|
| **A — VM (recommended pilot)** | App runs **natively** on an Ubuntu VM (systemd), calls the host's Docker for sandboxes — exactly like your laptop | **None** | Now → first schools |
| **B — Container Apps + Dynamic Sessions (scale)** | Sandbox rewritten to call Azure's managed sandbox API | Rewrite `core/sandbox.py` | When one VM isn't enough |

**Start with Track A.** It is faithful to your working local setup and needs zero
sandbox rewrite. Track B is documented at the bottom for when you scale.

---

## Prerequisites (local machine)

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) — `az login`
- Node 18+ (to build the frontend) and the SWA CLI: `npm i -g @azure/static-web-apps-cli`
- Git, SSH

Set shared variables (bash):

```bash
RG=ailab-rg
LOC=centralindia            # closest India region; verify service availability per resource
APP_NAME=ailab
```

> **Region note:** Central India supports VMs, PostgreSQL Flexible Server, and Azure
> Cache for Redis. **Azure Container Apps *Dynamic Sessions* (Track B) is region-limited** —
> check availability before committing Track B to an India region.

---

# TRACK A — VM pilot (do this first)

### A1. Resource group + managed data services

```bash
az group create -n $RG -l $LOC

# PostgreSQL Flexible Server (Burstable B1ms — cheapest; ~$12-15/mo on credits)
az postgres flexible-server create \
  -g $RG -n ${APP_NAME}-pg -l $LOC \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --admin-user ailabadmin --admin-password '<STRONG_PASSWORD>' \
  --public-access 0.0.0.0    # we'll restrict to the VM IP in A5

az postgres flexible-server db create -g $RG -s ${APP_NAME}-pg -d ailab

# Azure Cache for Redis (Basic C0 — ~$16/mo). First-party, credit-eligible.
az redis create -g $RG -n ${APP_NAME}-redis -l $LOC \
  --sku Basic --vm-size c0
```

Grab the connection strings:

```bash
# Postgres — note host is <name>.postgres.database.azure.com, sslmode=require
# DATABASE_URL=postgresql://ailabadmin:<pw>@${APP_NAME}-pg.postgres.database.azure.com/ailab?sslmode=require

# Redis — Azure Cache uses TLS on 6380 -> use the rediss:// scheme (your base.py already
# handles rediss:// SSL). Get the key:
az redis list-keys -g $RG -n ${APP_NAME}-redis
# REDIS_URL=rediss://:<primaryKey>@${APP_NAME}-redis.redis.cache.windows.net:6380/0
```

> Cheaper alternative for a tiny pilot: skip the managed Postgres/Redis and run both as
> Docker containers on the VM (see A4 note). Managed is more reliable; your credits cover it.

### A2. Create the VM

```bash
az vm create -g $RG -n ${APP_NAME}-vm -l $LOC \
  --image Ubuntu2204 --size Standard_B2s \
  --admin-username azureuser --generate-ssh-keys \
  --public-ip-sku Standard

# Open HTTP/HTTPS (Caddy handles TLS)
az vm open-port -g $RG -n ${APP_NAME}-vm --port 80 --priority 1001
az vm open-port -g $RG -n ${APP_NAME}-vm --port 443 --priority 1002

az vm show -g $RG -n ${APP_NAME}-vm -d --query publicIps -o tsv   # note the IP
```

Point a DNS **A record** (e.g. `api.yourdomain.com`) at that IP now — Caddy needs it for TLS.

### A3. Provision the VM (SSH in)

```bash
ssh azureuser@<VM_IP>

# System deps
sudo apt update && sudo apt install -y python3-venv python3-pip git docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker azureuser    # log out/in once for group to apply

# Clone your repo
git clone <YOUR_REPO_URL> ~/app
cd ~/app/Stage1/backend

# Python env
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install whitenoise    # to serve Django admin static in prod (see A6)
```

### A4. Build the sandbox images on the VM

The sandbox calls `docker run <image>`. Build every image your executors reference
(image names are in each app's `executor.py`, e.g. `regression-sandbox`, `cv-sandbox`):

```bash
cd ~/app/Stage1/backend
docker build -t regression-sandbox ./sandboxes/regression
docker build -t cv-sandbox         ./docker/cv-sandbox
# ...repeat for classification / neural_network sandbox images as referenced in their executor.py
docker images    # confirm they exist
```

> **Verify the image names** match the `sandbox_image` string passed to `run_in_sandbox()`
> in each `executor.py`. A missing image = a failed run with a Docker "not found" error.

### A5. Environment file

Create `~/app/.env` (your `base.py` loads the repo-root `.env`):

```env
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<run: python -c "import secrets;print(secrets.token_urlsafe(50))">
JWT_SIGNING_KEY=<another long random string>

DATABASE_URL=postgresql://ailabadmin:<pw>@ailab-pg.postgres.database.azure.com/ailab?sslmode=require
REDIS_URL=rediss://:<redisKey>@ailab-redis.redis.cache.windows.net:6380/0

ALLOWED_HOSTS=api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://app.yourdomain.com

# LLM — keep OpenRouter, OR switch to Azure OpenAI so spend hits your credit
OPENROUTER_API_KEY=<key>
```

Restrict Postgres to the VM's IP:

```bash
az postgres flexible-server firewall-rule create -g $RG -s ailab-pg \
  --rule-name vm --start-ip-address <VM_IP> --end-ip-address <VM_IP>
```

### A6. Migrate, seed, collect static

```bash
cd ~/app/Stage1/backend && source venv/bin/activate
export $(grep -v '^#' ~/app/.env | xargs)     # load env for one-off commands

python manage.py migrate
python manage.py seed_scenarios
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

Add WhiteNoise so the Django admin has CSS in production. In `config/settings/production.py`
add WhiteNoise to the middleware (right after `SecurityMiddleware`) and set the storage:

```python
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STORAGES = {"staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"}}
```

### A7. Run web + worker as systemd services

`/etc/systemd/system/ailab-web.service`:

```ini
[Unit]
Description=AI Lab Daphne (ASGI)
After=network.target
[Service]
User=azureuser
WorkingDirectory=/home/azureuser/app/Stage1/backend
EnvironmentFile=/home/azureuser/app/.env
ExecStart=/home/azureuser/app/Stage1/backend/venv/bin/daphne -b 127.0.0.1 -p 8001 config.asgi:application
Restart=always
[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/ailab-worker.service`:

```ini
[Unit]
Description=AI Lab Celery Worker
After=network.target
[Service]
User=azureuser
WorkingDirectory=/home/azureuser/app/Stage1/backend
EnvironmentFile=/home/azureuser/app/.env
ExecStart=/home/azureuser/app/Stage1/backend/venv/bin/celery -A config worker -l info
Restart=always
[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ailab-web ailab-worker
sudo systemctl status ailab-web ailab-worker
```

### A8. Caddy for HTTPS + WebSocket reverse proxy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
# (follow caddyserver.com/docs/install for the apt repo, then:)
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile` — Caddy auto-provisions TLS and proxies WebSockets transparently:

```
api.yourdomain.com {
    reverse_proxy 127.0.0.1:8001
}
```

```bash
sudo systemctl reload caddy
```

Your API is now live at `https://api.yourdomain.com`. Caddy sets `X-Forwarded-Proto`,
which the `SECURE_PROXY_SSL_HEADER` fix (already applied to `production.py`) relies on.

### A9. Deploy the frontend (Azure Static Web Apps — Free)

Locally, build against the live API:

```bash
cd Stage1/frontend
echo "VITE_API_URL=https://api.yourdomain.com/api/v1" > .env.production
npm install && npm run build      # outputs dist/

# Create the Static Web App and deploy the built folder
az staticwebapp create -g $RG -n ${APP_NAME}-web -l centralindia --sku Free
swa deploy ./dist --deployment-token $(az staticwebapp secrets list -g $RG -n ${APP_NAME}-web --query "properties.apiKey" -o tsv) --env production
```

Add your custom domain (`app.yourdomain.com`) in the Static Web App → Custom domains,
then make sure it's listed in `CORS_ORIGINS` / `CSRF_TRUSTED_ORIGINS` in `~/app/.env`
and restart: `sudo systemctl restart ailab-web`.

The env-based URL fix means your WebSocket automatically becomes
`wss://api.yourdomain.com/ws/agentic/...` — no code change needed.

### A10. Smoke test

- `https://app.yourdomain.com` loads, guest login works
- Prediction Engine → pick a scenario → **Run Model** returns a plot (proves the Docker sandbox works)
- Agentic Sandbox → save a flow → **Test Pipeline** streams logs (proves Channels/Redis/Celery work)
- `https://api.yourdomain.com/admin/` loads with styling (proves WhiteNoise + HTTPS)

---

## Cost & credit burn (Track A)

| Service | SKU | ~USD/mo |
|---|---|---|
| VM | B2s (2 vCPU / 4 GB) | ~$30–40 |
| PostgreSQL | Flexible B1ms | ~$12–15 |
| Redis | Basic C0 | ~$16 |
| Static Web Apps | Free | $0 |
| **Total** | | **~$60–70/mo** |

Against **$9,439**, the binding limit is the **04/15/2027 expiry**, not the money —
you'll spend only a fraction. Consider a bigger VM or more schools to actually use the credit.

---

# TRACK B — Container Apps + Dynamic Sessions (when you scale)

Do this when a single VM can't hold peak concurrency (e.g. exam week across many schools).

**1. Rewrite the sandbox.** Replace the `subprocess docker run` in `core/sandbox.py`
with a call to **Azure Container Apps Dynamic Sessions** (managed, Hyper-V-isolated,
~$0.03/session-hour). Shape:

```python
# Pseudocode — one session per run, upload script + inputs, execute, collect outputs
POST {poolManagementEndpoint}/executions?api-version=...
  { "identifier": run_id, "codeInputType": "inline", "code": script_code }
# then read stdout/files back from the session, and let it auto-deallocate
```

Package your existing sandbox images as **custom-container session pools** so the ML
libraries are preinstalled. Keep the `run_in_sandbox()` signature identical — only the body
changes — so the four executors need no edits.

**2. Containerize the app.** Add a `Dockerfile` (base `python:3.10-slim`, `pip install -r
requirements.txt`, `CMD daphne -b 0.0.0.0 -p 8001 config.asgi:application`), push to
**Azure Container Registry (Basic)**.

**3. Two Container Apps** in one environment: `web` (external ingress, WebSockets enabled)
and `worker` (no ingress, `celery -A config worker`, min-replicas 1). Both scale on
consumption; `web` autoscales on HTTP concurrency, `worker` on Redis queue length via KEDA.

**4. Reuse** the same managed Postgres + Redis; move env vars into Container App **secrets**.
Frontend (Static Web Apps) is unchanged — just repoint `VITE_API_URL` to the Container App FQDN.

> Because the sandbox is now managed, there's no Docker daemon or host-path volume
> problem — which is exactly why Track B scales and Track A doesn't past one box.

---

## Security checklist (before real students)

- [ ] `DEBUG=False` (production settings) — confirmed via `DJANGO_SETTINGS_MODULE`
- [ ] Strong unique `DJANGO_SECRET_KEY` / `JWT_SIGNING_KEY` (not the fallback)
- [ ] Postgres firewalled to the VM IP only; strong admin password
- [ ] `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS` set to real domains (no wildcards)
- [ ] Reconsider the **auto guest-login** in `AuthContext.jsx` for production — it
      auto-creates a shared `guest@example.com`; fine for demo, risky for real cohorts
- [ ] LLM keys only in server env / Container App secrets — never in the frontend build
- [ ] Sandbox keeps `--network none --read-only` caps (already set) — don't relax them
```
