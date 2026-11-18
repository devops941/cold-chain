# Cold Chain

A temperature-controlled logistics monitoring platform. It tracks cold-chain
shipments end to end, watches live sensor readings against each product's safe
temperature band, raises alerts on excursions and turns the whole network into
audit-ready analytics.

```
cold-chain/
├── backend/     Python · FastAPI · MongoDB (Motor)
└── frontend/    React 19 · Vite 8 · Tailwind v4 · Recharts
```

Everything the app needs lives inside these two folders.

---

## What it does

- **Live temperature monitoring** — every reading is compared against the
  shipment's safe band and flagged the moment it drifts.
- **Automatic alerts** — high temperature, low temperature and door-open events
  are created with the right severity (info / warning / critical).
- **Shipment visibility** — lanes, carriers, vehicles, drivers, ETA and a full
  telemetry history per shipment.
- **Data upload** — drag-and-drop CSV or JSON for readings, shipments, products
  and facilities. Row-level validation never stops a whole import.
- **Analytics** — temperature distribution, throughput, alert mix and carrier
  performance with a selectable 7 / 30 / 90-day window.
- **Compliance view** — alert resolution rate and the open/critical backlog.

## The interface

The UI is a light, 2026-trend interface: a warm off-white canvas, glassy
surfaces, rounded "bento" cards, soft shadows and a subtle gradient backdrop.
The palette deliberately avoids blue — it is built on **teal**, with **emerald**,
**amber**, **rose**, **violet**, **orange** and **lime** accents used to encode
meaning (safe / warning / critical). Typography pairs Plus Jakarta Sans headings
with Inter body text.

Screens: Login, Dashboard, Shipments, Shipment detail, Alerts, Analytics, Data
upload, Products, Facilities.

---

## Prerequisites

| Tool | Version used |
| --- | --- |
| Python | 3.13 |
| Node.js | 24 |
| MongoDB | 7/8 — local or MongoDB Atlas |

---

## 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (a working example is committed, and
`backend/.env.example` is the template):

```ini
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/"
MONGODB_DB=cold_chain

JWT_SECRET=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=720

UPLOAD_MAX_MB=10
UPLOAD_ALLOWED_EXTENSIONS=.csv,.json
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Seed demo data (3 users, 5 facilities, 6 products, 24 shipments and their
telemetry) and start the API:

```bash
python seed.py --reset     # optional: fresh demo dataset
python run.py              # http://localhost:8000
```

Interactive API docs: <http://localhost:8000/docs>

### MongoDB Atlas note

The Atlas cluster in the committed `.env` is a shared **free tier** cluster and
it is currently at its hard cap of **500 collections**. MongoDB refuses to
create any new database or collection until room is freed, so seeding fails
with `cannot create a new collection -- already using 500 collections of 500`.

Pick one:

1. **Free space** — drop a few unused collections/databases on the cluster
   (Atlas → Collections → drop), then run `python seed.py --reset`.
2. **Another cluster** — create a fresh free cluster and put its connection
   string in `MONGODB_URI`.
3. **Local MongoDB** — point `MONGODB_URI` at `mongodb://localhost:27017`
   (no collection limit).

The application code is unchanged either way — only `MONGODB_URI` matters.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

`frontend/.env`:

```ini
# Leave empty to use same-origin requests; Vite proxies /api to the backend.
VITE_API_URL=
VITE_PROXY_TARGET=http://localhost:8000
```

To point the built frontend at a deployed API instead of the dev proxy, set
`VITE_API_URL=https://your-api-host`.

Production build:

```bash
npm run build              # outputs frontend/dist
npm run preview            # serve the build locally
```

## 3. Sign in

The seed script creates three demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@coldchain.io` | `admin123` |
| Manager | `manager@coldchain.io` | `manager123` |
| Operator | `operator@coldchain.io` | `operator123` |

Registering the first account on an empty database also makes it an admin.

---

## API overview

All endpoints are under `/api` and require a bearer token except `auth/login`,
`auth/register` and `health`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Dashboard | `GET /dashboard` |
| Facilities | `GET/POST /facilities`, `PUT/DELETE /facilities/{id}` |
| Products | `GET/POST /products`, `PUT/DELETE /products/{id}` |
| Shipments | `GET/POST /shipments`, `GET/PATCH/DELETE /shipments/{id}`, `GET /shipments/{id}/telemetry` |
| Telemetry | `GET/POST /telemetry` |
| Alerts | `GET /alerts`, `PATCH /alerts/{id}` |
| Uploads | `GET /uploads`, `POST /uploads?kind=…`, `GET /uploads/templates/{kind}` |
| Analytics | `GET /analytics/overview?days=30` |

`POST /telemetry` is the live sensor hook: it stores the reading and creates an
alert automatically when the value leaves the shipment's safe band.

### Upload formats

Column names are matched case-insensitively and accept common aliases.

| Kind | Columns |
| --- | --- |
| `telemetry` | `shipment_code`, `ts`, `temperature_c`, `humidity_pct`, `door_open`, `battery_pct` |
| `shipments` | `code`, `origin_code`, `destination_code`, `carrier`, `vehicle_no`, `min_c`, `max_c`, `quantity`, `priority` |
| `products` | `sku`, `name`, `category`, `unit`, `min_c`, `max_c`, `shelf_life_days` |
| `facilities` | `name`, `code`, `type`, `city`, `country`, `capacity_pallets` |

`GET /uploads/templates/{kind}` returns the exact header list and a sample row.

---

## Tech stack

**Backend** — FastAPI, Uvicorn, Motor/PyMongo, Pydantic v2, PyJWT, bcrypt,
python-multipart.

**Frontend** — React 19, Vite 8, React Router 7, Tailwind CSS 4, Recharts,
Framer Motion, Zustand, Axios, Sonner, lucide-react, date-fns.
