# AegiSpace

> Intelligent Coworking Space Management Platform — AI-driven deal orchestration, real-time inventory allocation, and automated booking pipeline.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     AegiSpace Platform                       │
├──────────────────────┬───────────────────────────────────────┤
│      Frontend        │              Backend                  │
│  Next.js 14 / React  │  FastAPI + Supabase + FastRouter AI   │
│                      │                                       │
│  • Desk snapshot UI  │  • GET /health                        │
│  • Orchestrate btn   │  • GET /api/v1/inventory              │
│  • Status display    │  • POST /api/v1/bookings              │
│                      │  • POST /api/v1/nexus/orchestrate     │
└──────────────────────┴───────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     Supabase      │
                    │  inventory_items  │
                    │  leads            │
                    │  bookings         │
                    └───────────────────┘
```

## Branch Workflow

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Stable production baseline | Documentation only |
| `feature/skeleton-backend` | Core DB client, Pydantic models, FastAPI endpoints (inventory + bookings) | ✅ Complete |
| `feature/skeleton-frontend` | Next.js 14 app shell, desk UI, orchestrate trigger, project structure | ✅ Complete |
| `feature/production-ai` | FastRouter LLM engine, full allocation pipeline, `.gitignore` | ✅ Complete |
| `feature/production-svg-ui` | Interactive SVG floor map, metric cards | 🔲 Not started |

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env   # Fill in Supabase + FastRouter credentials
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Frontend
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2, Supabase Python Client, OpenAI SDK (FastRouter)
- **Frontend:** Next.js 14, React 19, TypeScript
- **Database:** Supabase (PostgreSQL)
- **AI:** FastRouter gateway → GPT-4o (configurable)

## Documentation

See `docs/` for:
- `contracts.json` — Database schemas and API endpoint contracts
- `status.md` — Task status board with branch tracking
- `logs.md` — Full transaction log from all agents
