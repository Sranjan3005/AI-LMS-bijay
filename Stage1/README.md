# Next-Gen Agentic EdTech Platform

Welcome to the Next-Gen Interconnected AI Learning Platform! This project empowers students to explore Artificial Intelligence through a dynamic 5-module journey: from intuitive AI Foundations to building advanced, no-code AI pipelines via our LangGraph-powered Agentic Workspace.

## 🚀 Tech Stack

- **Frontend:** React, Vite, React Flow, TailwindCSS (glassmorphism UI)
- **Backend:** Django, Django REST Framework, Celery
- **Database:** Neon Serverless PostgreSQL
- **Message Broker & Caching:** Upstash Redis
- **Code Execution Sandbox:** Docker Engine (Host)
- **AI Orchestration:** LangGraph, AsyncOpenAI (via OpenRouter)

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Docker Desktop** (CRITICAL: Must be installed and running to securely execute the student code in the Prediction Engine Sandbox)
- **Git**

---

## ⚙️ Environment Configuration

You will need to set up environment variables for both the backend and the frontend.

### 1. Backend (`backend/.env`)
Create a `.env` file in the `Stage1/backend` directory:
```env
# Django Settings
SECRET_KEY=your_django_secret_key
DEBUG=True

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-cool-name.region.aws.neon.tech/dbname?sslmode=require

# Redis (Upstash) for Celery
REDIS_URL=rediss://default:password@euw1-cool-name.upstash.io:6379

# AI APIs
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 2. Frontend (`frontend/.env`)
Create a `.env` file in the `Stage1/frontend` directory:
```env
VITE_API_URL=http://localhost:8001/api/v1
```

---

## 💻 Local Development Setup (Recommended for Devs)

Follow these steps to run the platform locally using native Node and Python environments.

### 1. Start Docker Desktop
Ensure Docker Desktop is open and the Docker daemon is running in the background. The backend relies on the local Docker socket to spin up isolated containers for the Python Sandbox.

### 2. Setup the Backend
Open a terminal and navigate to the backend directory:
```bash
cd Stage1/backend

# Create and activate a virtual environment (Windows)
python -m venv venv
.\venv\Scripts\Activate
# (For Mac/Linux: source venv/bin/activate)

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Seed the database with the core Greenhouse, Paper Plane, and Lemonade datasets
python manage.py seed_scenarios

# Start the Django Development Server (runs on port 8001)
python manage.py runserver 8001
```

### 3. Start the Celery Worker (Background Tasks)
Open a **new** terminal, activate your virtual environment, and start Celery. This is required for background model training and executing asynchronous LangGraph parallel pipelines.
```bash
cd Stage1/backend
.\venv\Scripts\Activate
celery -A config worker -l info --pool=solo
```

### 4. Setup the Frontend
Open a **new** terminal and navigate to the frontend directory:
```bash
cd Stage1/frontend

# Install Node modules
npm install

# Start the Vite development server (runs on port 5173)
npm run dev
```

You can now access the platform at `http://localhost:5173`!

---

## 🐳 Docker Deployment Setup (Full Stack Containerization)

*(If you prefer to run the entire stack via Docker Compose instead of local environments)*

### 1. Start Docker Desktop
Ensure Docker is running.

### 2. Create a `docker-compose.yml`
*(Note: Ensure you have your `.env` variables mapped if deploying to production.)*

To run the full stack, you would typically run:
```bash
docker-compose up --build
```
> **⚠️ CRITICAL NOTE FOR THE SANDBOX:** If you run the Django backend *inside* a Docker container, the backend will need access to the host's Docker daemon to spawn the ephemeral sandbox containers (Docker-in-Docker or mapping the `docker.sock`). For local development, running the Django backend natively (as shown in the Local Development Setup) while keeping Docker Desktop running on the host is the easiest and most stable approach.

---

## 📈 Architecture Highlights

- **2-Millisecond Native Predictions:** By training and caching Scikit-Learn models in-memory using Joblib, the Prediction Engine delivers lightning-fast feedback to students.
- **Asynchronous Agentic Flow:** The visual drag-and-drop React Flow canvas compiles into a Directed Acyclic Graph (DAG) via LangGraph. We utilize `asyncio` and `AsyncOpenAI` to execute independent AI nodes in parallel, slashing pipeline wait times by 75%.
- **Isolated Sandboxing:** When a student writes custom ML code, Django natively connects to your local Docker daemon to spin up an isolated, secure python container. The code executes, returns the logs, and the container is destroyed in less than `0.6` seconds.
