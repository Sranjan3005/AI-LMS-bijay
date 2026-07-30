# 🧠 Sutra — Interactive AI Learning Platform (Stage 1)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge)

**Sutra** is a story-driven, sandbox-based platform that teaches school students (Class 6–12) the fundamentals of Artificial Intelligence — from "what is data?" all the way to building no-code, multi-node AI pipelines. Students are guided by **Chiti**, an animated mascot, through a narrative "raising your own AI" journey rather than a text-heavy course.

> **Looking to deploy or ship an update?** See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the live Azure setup and the day-to-day update runbook.

---

## ✨ What's inside

A five-part learning flow, each framed as a chapter in an ongoing story:

* **🌱 AI Foundations** — what AI is, the emergence of intelligence, and the maths intuition behind it.
* **📊 Working with Data** — datasets, graphs, collecting/cleaning data, bias, and outliers, through interactive mini-games.
* **🔮 Prediction Engine (ML Labs)** — train and query real models for **Regression, Classification, and Neural Networks** on swappable data variants, with live plots and AI-generated explanations.
* **👁️ Computer Vision** — real vision models running **in the browser** (object detection via COCO-SSD, edge detection, digit/handwriting reading) plus dataset-driven training scenarios.
* **🤖 Agentic Flow Studio** — a drag-and-drop canvas where students wire **nodes** (inputs, LLM processors, routers, outputs) into an AI pipeline that compiles to a **LangGraph** and executes live.
* **⚖️ AI Ethics Arena** — six gamified levels on bias, privacy, deepfakes, hallucination, and more.

**Platform layers:**
* **Chiti mascot** — an animated 3D/2D character with **voice narration** that escorts students step by step.
* **Story mode** — case files, mission cards, and "achievement" reveals as modules complete.
* **CBSE curriculum** mapping and a focused mobile/**Android** (Capacitor) build.
* **Parent reports** — daily progress summaries (WhatsApp/opt-in).
* **Dual portals** — Student, School-Admin, and Company-Admin.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite, React Flow (`@xyflow/react`), Framer Motion, Plotly/Recharts, Three.js (`@react-three/fiber`) |
| **In-browser ML** | TensorFlow.js — COCO-SSD, MobileNet, KNN classifier, Tesseract.js (OCR) |
| **Backend** | Django + Django REST Framework + Django Channels (WebSockets) |
| **Async** | Celery workers |
| **Agentic engine** | LangGraph, compiled from React Flow JSON, over Azure OpenAI |
| **LLM / Vision** | Azure OpenAI (`gpt-4o-mini` deployment) |
| **Code sandbox** | Docker (local) / **Azure Container Apps Dynamic Sessions** (cloud) |
| **Database** | PostgreSQL |
| **Cache / broker / WS layer** | Redis |
| **Hosting** | Azure Static Web Apps (frontend) + Azure Container Apps (backend web + worker) |

---

## 🏗️ Architecture Overview

```
Browser / Android WebView
        │
        ▼
Frontend (React/Vite SPA)  ──►  Backend web (Django/ASGI + Channels)
   • client-side ML (TF.js)        │        │            │
   • React Flow canvas         SQL │  broker│/WS     task │queue
                                   ▼        ▼            ▼
                              PostgreSQL   Redis   Celery worker
                                                        │
                              Azure OpenAI (LLM/vision) │ code sandbox
                                                        ▼
                                             Dynamic Sessions / Docker
```

* **Frontend** — a pure SPA. Computer-vision and some ML run **entirely client-side** (no backend round-trip). The Agentic canvas is a React Flow graph serialized to JSON.
* **Backend web** — Daphne/ASGI serving DRF endpoints **and** WebSockets (live agentic execution streaming).
* **Backend worker** — Celery runs background model training and the async LangGraph pipelines.
* **Agentic execution** — the saved React Flow JSON is compiled into a LangGraph `StateGraph` (`agentic_flow/compiler.py`), run on the worker, and results stream back node-by-node over a WebSocket.

---

## 🛠️ Prerequisites

* **Python 3.10+**
* **Node.js 18+** (with npm)
* **Docker Desktop** — required for the local code-execution sandbox (student ML/CV code runs in isolated containers)
* **Git**

---

## 🚀 Local Setup

> The backend loads a single `.env` at the **repo root** (next to this README).

### 0. Environment variables (`.env` at repo root)

```env
# Django
DJANGO_SECRET_KEY="your-secret-key"
JWT_SIGNING_KEY="another-long-random-string"
DEBUG="True"

# Database (PostgreSQL) & Redis
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
REDIS_URL="redis://127.0.0.1:6379/1"

# Azure OpenAI (agentic flow: LLM / vision / object-detection nodes)
AZURE_OPENAI_ENDPOINT="https://<your-openai>.openai.azure.com/"
AZURE_OPENAI_API_KEY="your-azure-openai-key"
AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
AZURE_OPENAI_API_VERSION="2024-08-01-preview"

# Azure Dynamic Sessions (CV / ML training sandbox) — optional locally if using Docker
AZURE_SESSION_POOL_ENDPOINT="https://<region>.dynamicsessions.io/.../sessionPools/<pool>"
```

### 1. Backend (Django) — runs on port **8001**

```bash
cd Stage1/backend

# Virtual environment
python -m venv venv
.\venv\Scripts\activate            # Windows
# source venv/bin/activate         # macOS/Linux

pip install -r requirements.txt

python manage.py migrate           # apply schema
python manage.py seed_scenarios    # seed the scenario/variant catalog (required for the UI)
python manage.py runserver 8001
```

> The frontend expects the API at `http://localhost:8001/api/v1` by default (see `src/api.js`).

### 2. Celery worker (new terminal) — background training + agentic pipelines

```bash
cd Stage1/backend
.\venv\Scripts\activate
celery -A config worker -l info --pool=solo    # --pool=solo is needed on Windows
```

Redis must be running (e.g. `docker run -d -p 6379:6379 redis`).

### 3. Frontend (React/Vite) — runs on port **5174**

```bash
cd Stage1/frontend
npm install
npm run dev
```

Open **http://localhost:5174**.

> **Guest login:** the app auto-logs in as a shared demo student (`guest@example.com` / `guestpassword`), so you can explore without creating an account. Use `python manage.py createsuperuser` for admin access.

---

## 📱 Android build

Sutra is wrapped as a native Android app with **Capacitor** (`Stage1/frontend/android/`). It runs the production web build against the deployed Azure backend. See **[ANDROID_SETUP.md](ANDROID_SETUP.md)** for the full build/run guide (needs Android Studio + JDK 21).

```bash
cd Stage1/frontend
npm run cap:sync    # vite build + sync into the native project
npm run cap:open    # open in Android Studio
```

---

## 🗂️ Repository layout

```
Stage1/
  backend/                 Django project (config/, accounts/, assignments/,
                           agentic_flow/, classification/, regression/,
                           neural_network/, computer_vision/, scenarios/, ...)
  frontend/                React + Vite SPA
    src/pages/             module pages (AIFoundations, AgenticSandbox, AIEthicsArena, ...)
    src/components/        chiti/ (mascot), story/, workspace/, sutra/ (shell)
    src/lib/               client-side ML (cv/, ml/) + datasets
    android/               Capacitor native project
DEPLOYMENT.md              live Azure setup + update runbook
DEPLOYMENT_AZURE.md        first-time Azure build-out (VM + Container Apps tracks)
ANDROID_SETUP.md           Android build guide
```

---

## 🧪 Try it

1. Open **http://localhost:5174** — you land on the Student dashboard (auto guest login).
2. **Working with Data** → play the outlier/bias/cleaning mini-games.
3. **Prediction Engine** → pick Regression/Classification/Neural → choose a scenario → select a data variant → review the plot → **Train** → ask the model to predict.
4. **Computer Vision** → detect objects with your webcam, trace edges, or have a neural net read a digit you draw.
5. **Agentic Flow Studio** → drag nodes onto the canvas, connect them, **Save & Run**, and watch each node light up as the pipeline executes live.
