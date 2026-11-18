# Cold Chain — Temperature-Controlled Logistics Platform

> Analysis, architecture and implementation plan for the `cold-chain` project.

---

## 1. Analysis of the repository

The upstream repository `devops941/cold-chain` currently contains a single file:

```
README.md   →  "# cold-chain"
```

There is **no specification `.md` file** committed. The scope below is therefore
derived from the product requirements supplied for this task, written down here as
the authoritative spec so the project has a single source of truth.

**Product:** a cold-chain monitoring platform for temperature-controlled logistics —
pharmaceutical, dairy, frozen food and vaccine distribution.

**Core jobs of the product**

1. Register facilities (warehouses, hubs, retail) and the products they store.
2. Plan shipments with a required temperature band (`min °C` … `max °C`).
3. Ingest telemetry (temperature, humidity, door, battery, GPS) — live and via file upload.
4. Detect excursions automatically and raise alerts.
5. Give operators dashboards, analytics and a full audit trail.

---

## 2. Hard requirements (from the brief)

| # | Requirement | Implementation |
|---|-------------|----------------|
| R1 | MongoDB database | MongoDB Atlas via `MONGODB_URI` in `.env` |
| R2 | `.env` with upload / data options | `backend/.env` + `backend/.env.example` |
| R3 | Data **upload** option | `POST /api/uploads` (CSV **and** JSON, drag & drop UI) |
| R4 | Easy-to-understand UI | Plain-language labels, inline help, guided empty states |
| R5 | Advanced components | Charts, live gauges, sparklines, timeline, data table with sort/filter/pagination, drag-drop uploader |
| R6 | Light theme | Light-only design tokens |
| R7 | **No blue** colour | Palette = teal / emerald / amber / rose / violet / orange / lime |
| R8 | 2026-trend UI | Soft shadows, large radii, glass surfaces, bento grid, motion |
| R9 | `frontend/` and `backend/` folders only | Every file lives inside one of these two folders |
| R10 | Backend = Python | FastAPI + Motor (async MongoDB) |
| R11 | Frontend = React | React 19 + Vite + Tailwind CSS v4 |
| R12 | Runs without errors | Backend smoke-tested against Atlas, frontend production build verified |

---

## 3. Architecture

```
cold-chain/
├── PROJECT.md              ← this spec
├── README.md               ← how to run
├── backend/                ← Python API (everything backend lives here)
│   ├── .env                ← secrets + upload settings
│   ├── .env.example
│   ├── requirements.txt
│   ├── run.py              ← dev entrypoint
│   ├── seed.py             ← demo data seeder
│   └── app/
│       ├── main.py         ← FastAPI app + routers + CORS
│       ├── config.py       ← pydantic-settings (reads .env)
│       ├── database.py     ← Mongo client, indexes, health
│       ├── security.py     ← bcrypt hashing + JWT
│       ├── deps.py         ← auth / role dependencies
│       ├── models/         ← pydantic request + response schemas
│       ├── routers/        ← auth, dashboard, facilities, products,
│       │                     shipments, telemetry, alerts, uploads, analytics
│       └── services/       ← ingest + analytics business logic
└── frontend/               ← React app (everything frontend lives here)
    ├── .env
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── api/            ← axios client + endpoints
        ├── store/          ← auth state (zustand)
        ├── components/     ← design system + advanced widgets
        └── pages/          ← Login, Dashboard, Shipments, ShipmentDetail,
                              Products, Facilities, Upload, Alerts, Analytics,
                              Settings
```

**Data flow**

```
CSV / JSON upload ─┐
live sensor POST ──┼─▶ ingest service ─▶ telemetry ─▶ excursion check ─▶ alerts
                   │                                        │
                   └────────────── MongoDB Atlas ◀──────────┘
                                        │
                          FastAPI REST ─┴─▶ React (axios + zustand)
```

---

## 4. Data model (MongoDB collections)

| Collection | Key fields |
|------------|-----------|
| `users` | name, email (unique), password_hash, role, org |
| `facilities` | name, code (unique), type, city, country, lat, lng, capacity |
| `products` | sku (unique), name, category, unit, min_c, max_c, shelf_life_days |
| `shipments` | code (unique), origin, destination, carrier, vehicle, driver, status, priority, min_c, max_c, quantity, departed_at, eta, delivered_at |
| `telemetry` | shipment_id, ts, temperature_c, humidity_pct, door_open, battery_pct, lat, lng, source |
| `alerts` | shipment_id, type, severity, message, value, threshold, status, created_at |
| `uploads` | filename, kind, rows, inserted, failed, status, uploaded_by, errors |

Indexes: unique on `users.email`, `products.sku`, `facilities.code`,
`shipments.code`; compound `(shipment_id, ts)` on `telemetry`; `(status, created_at)`
on `alerts`.

---

## 5. Roles

| Role | Can do |
|------|--------|
| `admin` | everything, incl. user-facing settings |
| `manager` | CRUD products, facilities, shipments, uploads |
| `operator` | create shipments, post telemetry, acknowledge alerts |
| `viewer` | read-only dashboards and reports |

---

## 6. Upload formats

**Telemetry CSV**

```csv
shipment_code,ts,temperature_c,humidity_pct,door_open,battery_pct
CC-2026-0001,2026-02-11T08:00:00Z,4.2,63,false,97
```

**Shipments JSON**

```json
[{ "code": "CC-2026-0100", "origin_code": "FAC-BLR-01", "destination_code": "FAC-CHN-02",
   "carrier": "ThermoMove", "vehicle_no": "KA01AB1234", "min_c": 2, "max_c": 8,
   "quantity": 1200, "priority": "high" }]
```

The uploader auto-detects columns, validates each row, reports per-row errors and
never aborts the whole file because of one bad row.

---

## 7. UI design system (2026, light, no blue)

**Palette** — teal `#0d9488` primary, emerald `#10b981`, amber `#f59e0b`,
rose `#f43f5e`, violet `#8b5cf6`, orange `#fb923c`, lime `#84cc16`.
Neutrals are warm-stone. **No blue hue is used anywhere.**

**2026 trends applied**

* Soft, layered shadows instead of hard borders.
* Generous corner radii (16–28 px) and pill controls.
* Bento-grid dashboards with glass (frosted) panels.
* Motion that explains state (enter/fade, hover lift, animated gauges).
* Big, readable type; data-dense but calm.
* Full light theme with subtle gradient mesh backgrounds.

---

## 8. Delivery plan

1. Write this spec. ✅
2. Build the backend package (`backend/`), install latest pins, seed demo data.
3. Build the frontend (`frontend/`) with the design system above.
4. Install latest npm packages, run the production build, fix any errors.
5. Smoke-test the API against MongoDB Atlas.
6. Update `README.md` with run instructions.
7. Commit, push a feature branch, open a PR.

## 9. Latest package versions pinned

**Backend:** fastapi 0.163.2 · uvicorn 0.54.0 · motor 3.7.1 · pymongo 4.20.0 ·
pydantic 2.14.3 · pydantic-settings 2.16.3 · PyJWT 2.15.1 · bcrypt 5.0.0 ·
python-multipart 0.0.34 · email-validator 2.4.0

**Frontend:** react 19.3.1 · vite 8.3.8 · tailwindcss 4.3.5 ·
react-router-dom 7.18.5 · axios 1.21.1 · recharts 3.11.0 · lucide-react 1.75.0 ·
framer-motion 14.14.0 · date-fns 4.4.0 · sonner 2.0.8 · zustand 5.1.0
