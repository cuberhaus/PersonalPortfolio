"""
Planner API: ENHSP (numeric PDDL) behind FastAPI.
Stock Fast Downward does not support :fluents; ENHSP does.
"""

from __future__ import annotations

# ── Phase 14 (Option A) — Sentry SDK + JSON-line stdout (no-op if missing) ─
try:
    from ._sentry_obs import (  # type: ignore[import-not-found]
        init_observability,
        breadcrumb as _crumb,
        span as _span,
        tag as _tag,
        SessionIdMiddleware as _SessionIdMiddleware,
    )

    init_observability(service="planner-api")
except ImportError:
    from contextlib import contextmanager

    def _tag(*_a, **_kw):
        return None

    def _crumb(*_a, **_kw):
        return None

    @contextmanager
    def _span(*_a, **_kw):
        yield None

    class _SessionIdMiddleware:  # type: ignore[no-redef]
        def __init__(self, app):
            self.app = app

        async def __call__(self, scope, receive, send):
            await self.app(scope, receive, send)

import importlib.resources as ir
import os
import re
import subprocess
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse

from .normalize import normalize_domain_for_planner

MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", "262144"))
PLAN_TIMEOUT_SEC = float(os.environ.get("PLAN_TIMEOUT_SEC", "30"))
API_KEY = os.environ.get("PLANNER_API_KEY", "").strip()
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").strip()


def _enhsp_jar() -> Path:
    import up_enhsp

    base = ir.files(up_enhsp) / "ENHSP" / "enhsp.jar"
    return Path(str(base))


class PlanRequest(BaseModel):
    domain: str = Field(..., max_length=200_000)
    problem: str = Field(..., max_length=200_000)


app = FastAPI(title="PDDL Planner API", version="1.0.0")
app.add_middleware(_SessionIdMiddleware)

_origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Avoid 404 when opening the server URL in a browser."""
    return {
        "service": "PDDL Planner API",
        "planner": "enhsp",
        "endpoints": {
            "GET /health": "Liveness check",
            "POST /plan": 'Body: {"domain": "<pddl>", "problem": "<pddl>"} → plan + log',
        },
    }


@app.get("/health")
def health():
    return {"ok": True, "planner": "enhsp"}


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/plan":
        cl = request.headers.get("content-length")
        if cl:
            try:
                if int(cl) > MAX_BODY_BYTES:
                    return JSONResponse(
                        {"ok": False, "error": "Request body too large", "plan": []},
                        status_code=413,
                    )
            except ValueError:
                pass
    return await call_next(request)


@app.post("/plan")
def plan(req: PlanRequest, request: Request):
    if API_KEY:
        if request.headers.get("X-API-Key") != API_KEY:
            raise HTTPException(status_code=401, detail="Invalid or missing API key")

    domain = normalize_domain_for_planner(req.domain.strip())
    problem = req.problem.strip()
    if not domain or not problem:
        raise HTTPException(status_code=400, detail="domain and problem required")

    domain_kb = len(domain.encode("utf-8")) // 1024
    problem_kb = len(problem.encode("utf-8")) // 1024
    _tag("domain_size_kb", domain_kb)
    _tag("problem_size_kb", problem_kb)
    _crumb(
        "planner", "plan request received",
        domain_size_kb=domain_kb, problem_size_kb=problem_kb,
    )

    jar = _enhsp_jar()
    if not jar.is_file():
        raise HTTPException(status_code=500, detail="ENHSP jar not found")

    try:
        with tempfile.TemporaryDirectory(prefix="pddl_") as tmp:
            dpath = Path(tmp) / "domain.pddl"
            ppath = Path(tmp) / "problem.pddl"
            spath = Path(tmp) / "plan.out"
            dpath.write_text(domain, encoding="utf-8")
            ppath.write_text(problem, encoding="utf-8")

            cmd = [
                "java",
                "-jar",
                str(jar),
                "-o",
                str(dpath),
                "-f",
                str(ppath),
                "-sp",
                str(spath),
                "-npm",
            ]
            _crumb(
                "planner", "subprocess start",
                jar=str(jar), timeout_sec=PLAN_TIMEOUT_SEC,
            )
            t0 = time.monotonic()
            with _span(
                "enhsp.subprocess",
                description="java -jar enhsp",
                domain_size_kb=domain_kb,
                problem_size_kb=problem_kb,
                timeout_sec=PLAN_TIMEOUT_SEC,
            ):
                proc = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=PLAN_TIMEOUT_SEC,
                    encoding="utf-8",
                    errors="replace",
                )
            elapsed = time.monotonic() - t0
            _crumb(
                "planner", "subprocess return",
                returncode=proc.returncode, elapsed_sec=round(elapsed, 3),
            )
            log = proc.stdout + ("\n" + proc.stderr if proc.stderr else "")

            plan_lines: list[str] = []
            if spath.is_file():
                for line in spath.read_text(encoding="utf-8", errors="replace").splitlines():
                    line = line.strip()
                    if line.startswith("(") and line.endswith(")"):
                        plan_lines.append(line)

            if not plan_lines and "Found Plan:" in proc.stdout:
                capture = False
                for line in proc.stdout.splitlines():
                    if "Found Plan:" in line:
                        capture = True
                        continue
                    if capture:
                        s = line.strip()
                        if not s or s.startswith("Plan-Length") or s.startswith("Metric"):
                            if plan_lines:
                                break
                            continue
                        if re.match(r"^\d+\.\d+:", s):
                            idx = s.find(": ")
                            if idx >= 0:
                                s = s[idx + 2 :].strip()
                        if s.startswith("(") and s.endswith(")"):
                            plan_lines.append(s)

            ok = proc.returncode == 0 and bool(plan_lines)
            if proc.returncode != 0 and not plan_lines:
                _tag("outcome", "error")
                return {
                    "ok": False,
                    "error": log.strip()[:8000] or f"exit {proc.returncode}",
                    "stdout": log,
                    "plan": [],
                    "time_sec": round(elapsed, 3),
                }

            if not plan_lines:
                _tag("outcome", "error")
                return {
                    "ok": False,
                    "error": "No plan in output; check domain/problem PDDL.",
                    "stdout": log,
                    "plan": [],
                    "time_sec": round(elapsed, 3),
                }

            _tag("outcome", "ok")
            return {
                "ok": True,
                "plan": plan_lines,
                "stdout": log,
                "time_sec": round(elapsed, 3),
            }
    except subprocess.TimeoutExpired:
        _tag("outcome", "timeout")
        _crumb("planner", "subprocess timeout", level="warning",
               timeout_sec=PLAN_TIMEOUT_SEC)
        return {
            "ok": False,
            "error": f"Planner timed out after {PLAN_TIMEOUT_SEC}s",
            "stdout": "",
            "plan": [],
        }
    except Exception as e:
        _tag("outcome", "error")
        _crumb("planner", "exception", level="error", error=str(e)[:200])
        return {
            "ok": False,
            "error": str(e)[:2000],
            "stdout": "",
            "plan": [],
        }
