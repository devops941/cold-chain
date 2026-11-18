# AGENTS.md

Repository notes for future sessions.

## Layout

Only two code folders exist, by design: `backend/` (Python) and `frontend/`
(React). Do not add a third top-level code folder.

## Run

```bash
# backend
cd backend && source .venv/bin/activate && python run.py      # :8000
# frontend
cd frontend && npm run dev                                    # :5173
```

- Backend reads `backend/.env` (git-ignored; `backend/.env.example` is the
  template). `MONGODB_URI` is the only value that needs changing per machine.
- Frontend reads `frontend/.env`. Empty `VITE_API_URL` means same-origin, with
  Vite proxying `/api` to `VITE_PROXY_TARGET` (default `http://localhost:8000`).

## Tests and checks

- No test suite. Verify with `python seed.py --reset` then exercise the API, and
  `npm run build` for the frontend.
- `python -c "import app.main"` is the quick import check for the backend.

## Gotchas

- The Atlas cluster in the original spec is a shared free-tier cluster that is
  at its hard 500-collection cap, so `cold_chain` cannot be created there.
  `ensure_indexes()` deliberately swallows `PyMongoError` so the API still
  boots; `/api/health` reports Mongo reachability. Use a local MongoDB
  (`mongodb://localhost:27017`) or another cluster to seed.
- MongoDB documents are serialised through `app/utils.serialize`, which maps
  `_id` to `id` and converts any `ObjectId`/`datetime` in any field. Use
  `serialize_many` for lists — returning raw docs breaks FastAPI validation.
- Alert severity comes from `app/services/ingest.py`: how far a reading drifts
  past the band decides info / warning / critical.

## Style

- UI palette is teal-based and must not introduce blue hues. Accent colours
  (emerald, amber, rose, violet, orange, lime) encode meaning only.
- Light theme, 2026 trends: glassy surfaces, bento cards, soft shadows.
