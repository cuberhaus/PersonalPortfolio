# PDDL Planner API (ENHSP)

Small **FastAPI** service that runs **[ENHSP](https://sites.google.com/view/enhsp/)** on PDDL domain + problem JSON. Classical **Fast Downward** does not accept `:fluents`; ENHSP supports numeric fluents and metrics.

Ships inside **PersonalPortfolio** for the planificación demo. GitHub Pages serves only static files — deploy this folder separately for production.

## Run locally

```bash
cd PersonalPortfolio/planner-api   # or: from portfolio root, cd planner-api
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Java 17+ required on PATH
export PLAN_TIMEOUT_SEC=30
python -m uvicorn app.main:app --reload --port 8765
```

Open `http://127.0.0.1:8765/` in a browser for a short JSON overview (avoids a bare 404).

`POST http://127.0.0.1:8765/plan` with JSON:

```json
{ "domain": "(define (domain ...", "problem": "(define (problem ..." }
```

Response: `{ "ok": true, "plan": ["(action ...)", ...], "stdout": "...", "time_sec": 0.01 }` or `{ "ok": false, "error": "...", "plan": [] }`.

## Docker

```bash
docker build -t planner-api .
docker run --rm -p 8000:8000 \
  -e CORS_ORIGINS=https://your-site.pages.dev \
  planner-api
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `PLANNER_API_KEY` | (empty) | If set, require header `X-API-Key` |
| `PLAN_TIMEOUT_SEC` | `30` | Solver subprocess timeout |
| `MAX_BODY_BYTES` | `262144` | Reject larger `Content-Length` on `/plan` |

## PDDL normalization

Some course domains use self-referential types (`ciudad - ciudad`) or declare `:functions` before `:predicates`. The API normalizes those so ENHSP can parse them; semantics stay the same for typical práctica domains.
