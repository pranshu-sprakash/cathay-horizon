# Cathay Horizon

**"Cathay remembers, so you never ask twice."**

Cathay Horizon is a persistent passenger preference memory and proactive operations platform built for Cathay Pacific (flight route CX251 HKG -> LHR). It connects a 6-tap pre-flight preference profile ("My Rhythm") with an offline-first Crew iPad view, arrival logistics, and an 8-rule deterministic Python safety guardrail engine powered by Gemini 2.5 Flash.

## Repository Structure

* **`/` (Root)** — Primary Next.js 16 passenger, crew iPad, and operations UI (runs on `http://localhost:4317`).
* **`backend/`** — Python FastAPI server, Gemini 2.5 Flash agent engine, 3-way privacy consent guardrails, and spatial/flight telemetry modules (runs on `http://localhost:8000`).

---

## Quick Start

### 1. Start the FastAPI Backend (Terminal 1)

    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements-mae2.txt 2>/dev/null || true

    # Optional: Set your Gemini API key (automatically falls back to deterministic local state if omitted)
    export GEMINI_API_KEY="your_api_key_here"

    uvicorn main:app --reload --host 0.0.0.0 --port 8000

* **API Docs:** `http://localhost:8000/docs`

### 2. Start the Next.js UI (Terminal 2)

From the **root** `cathay-horizon` folder:

    npm install
    npm run dev

* **Web UI:** `http://localhost:4317`
