# Sutra Platform: Complete Architecture Document (HLD & LLD)

This document provides a comprehensive High-Level Design (HLD) and Low-Level Design (LLD) for the entire Sutra AI learning platform (Stage 1).

---

## 1. High-Level Design (HLD)

The platform is designed as an interactive, gamified AI learning environment. It relies on a strictly decoupled Client-Server architecture.

### 1.1 Tech Stack Overview
* **Frontend:** React.js (Vite), React Flow (Node Editors), Three.js / React Three Fiber (3D Assistant), Framer Motion (Animations), Chart.js (Data Vis).
* **Backend:** Django, Django REST Framework (DRF), Celery (Async Jobs), Redis (Message Broker & Cache), Django Channels (WebSockets).
* **AI Integrations:** Azure OpenAI SDK (`gpt-4o-mini`, `whisper`) powering all dynamic evaluations, narrative generation, and agentic workflows.

### 1.2 Routing & Application State
The frontend is a pure Single Page Application (SPA). Instead of using a traditional library like `react-router`, navigation is entirely controlled by a state machine in `App.jsx` (`currentView`, `returnView`, `storyCtx`). 
* This allows smooth, unbroken transitions for the 3D assistant (Chiti), which must persist across page changes without reloading its WebGL context.
* **Heavy Views Management:** For compute-heavy modules (e.g., CV Playgrounds using TensorFlow, Data Labs), the 3D assistant is temporarily unmounted to preserve GPU memory.

### 1.3 Role-Based Access Control (RBAC)
The UI renders completely different environments based on JWT-authenticated user roles:
1. **Student:** Accesses the gamified learning flow, missions, and sandboxes.
2. **Staff/Instructor:** Accesses the `AdminDashboard` to view class metrics.
3. **School Admin:** Accesses the `SchoolAdminPanel` to manage district-wide analytics.

---

## 2. Core Modules (The Web Application)

The platform is divided into five distinct learning domains, all housed under the `/frontend/src/pages/` directory:

### A. The Story & Gamification Layer (`/components/story/`)
* Wraps the entire learning experience. Students select "Missions" from the `StudentHome` dashboard.
* Uses `CaseFile.jsx` to introduce topics (like a detective briefing) and `StoryBeat.jsx` to conclude modules with narrative progression.
* Tracks completion via the backend `assignments` app to unlock subsequent chapters.

### B. AI Foundations & Data Skills (`/pages/AIFoundations/`, `/pages/DataSkills/`)
* Highly interactive, theory-driven mini-games and lessons.
* Includes: `WhatIsAI.jsx`, `MathsForAI.jsx`, `TeachTheMachine.jsx` (which trains simple heuristic models in browser), `ChartDetective.jsx`, and `DataAnalysis.jsx`.

### C. AI Ethics Arena (`/pages/AIEthicsArena/`)
* A 6-level gamified hub (`AIEthicsHub.jsx`) where students face ethical dilemmas.
* Examples: `Level1EmotionDetector` (bias in CV), `Level4DeepfakeDetective` (identifying manipulated media), `Level5PrivacyEscapeRoom`.

### D. Machine Learning Labs (`/pages/LabWorkspace.jsx`, `/pages/CVPlayground.jsx`)
* Interactive environments where students build, train, and test classic ML models (Linear Regression, Neural Networks, Computer Vision).
* Operates largely on the client-side using browser-based ML libraries or visual heuristic sliders before testing against validation datasets.

### E. Agentic Sandbox (`/pages/AgenticSandbox/`)
* A visual node-based editor (`AgenticWorkspace.jsx`) where students drag and drop components (LLMs, Scrapers, Vision Scanners) to build AI workflows.
* Compiles down to LangGraph state machines on the backend and streams execution logs back to the browser via WebSockets.

---

## 3. Low-Level Design (LLD)

### 3.1 Frontend Component Hierarchy

```text
App.jsx (Auth Context, Global State)
 ├── ChitiProvider (Global 3D Assistant State)
 │    └── ChitiStage (Three.js WebGL Canvas)
 └── SutraShell (Persistent UI: Nav, Footer, Background)
      ├── StudentHome (Mission Selection)
      │    └── CaseFile (Module Briefing)
      ├── ExploreTab / Prebuilt Scenarios
      ├── LabWorkspace (ML Models)
      ├── AIEthicsHub (Ethics Gamification)
      └── AgenticWorkspace (Node Builder)
           ├── NodeInfo & Sidebar (Drag/Drop Palette)
           └── Custom Nodes (TextInput, LLM, Scraper, etc.)
```

### 3.2 Backend Service Architecture

The Django backend is split into three primary apps:

#### 1. `authentication` App
* Handles JWT token generation, refresh logic, and user role categorization.

#### 2. `assignments` App
* **LLD Models:** 
  * `Assignment`: Metadata for tasks (e.g., "Build a fake news detector").
  * `ActivityCompletion`: Tracks which specific `CaseFiles` or `StoryBeats` a student has viewed.
  * `Submission`: Stores the final JSON pipeline or ML accuracy score submitted by the student, along with an AI-generated grade/feedback.

#### 3. `agentic_flow` App
* **LLD Models:** `AgenticWorkflow` (stores the JSON graph topology).
* **Compiler Engine (`compiler.py`):** 
  * Takes a React Flow JSON array (Nodes, Edges) and maps them to LangGraph node factories.
  * *Example:* A node with type `visionScanner` triggers `make_node_vision_scanner()` which uses Azure OpenAI Vision to parse a Base64 image payload.
* **Asynchronous Executor (`tasks.py`):**
  * Spawns a Celery worker.
  * Executes the compiled graph using `.astream(stream_mode="updates")`.
  * For each tick of the graph, it fires a `group_send` to Django Channels.
* **WebSocket Consumers (`consumers.py`):**
  * Accepts connections from `AgenticWorkspace.jsx` and relays the Celery execution streams back to the UI for live node-highlighting.

---

## 4. Data Flow Example: Gamified Module Completion

1. **Start:** Student clicks a mission on `StudentHome.jsx`.
2. **Context Shift:** `App.jsx` updates `currentView` to `casefile` and loads the introductory briefing.
3. **Engagement:** Student completes the activity (e.g., `Level1EmotionDetector.jsx`).
4. **Completion API:** Frontend sends `POST /assignments/activity-complete/` to log the milestone.
5. **Narrative Reveal:** `App.jsx` intercepts the return route, detecting the module is finished, and sets `currentView` to `storybeat` to play the success animation.
6. **Unlock:** The backend database updates, unlocking the final Assignment/Agentic Flow associated with that module.
