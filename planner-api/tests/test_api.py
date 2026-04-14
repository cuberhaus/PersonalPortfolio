"""Tests for the PDDL Planner API endpoints.

Run: cd planner-api && python -m pytest tests/ -v
"""

from __future__ import annotations

import os
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


# Patch _enhsp_jar before importing app so it doesn't fail if jar is missing
@pytest.fixture(autouse=True)
def _patch_enhsp_jar(tmp_path):
    jar = tmp_path / "enhsp.jar"
    jar.write_text("fake")
    with patch("app.main._enhsp_jar", return_value=jar):
        yield


@pytest.fixture()
def client():
    from app.main import app
    return TestClient(app)


# ─── GET / ────────────────────────────────────────────────────────

def test_root_returns_service_info(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["service"] == "PDDL Planner API"
    assert data["planner"] == "enhsp"
    assert "endpoints" in data


# ─── GET /health ──────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["planner"] == "enhsp"


# ─── POST /plan — validation ─────────────────────────────────────

def test_plan_empty_body(client):
    r = client.post("/plan")
    assert r.status_code == 422  # Pydantic validation error


def test_plan_missing_domain(client):
    r = client.post("/plan", json={"problem": "(define (problem p))"})
    assert r.status_code == 422


def test_plan_missing_problem(client):
    r = client.post("/plan", json={"domain": "(define (domain d))"})
    assert r.status_code == 422


def test_plan_empty_strings(client):
    r = client.post("/plan", json={"domain": "", "problem": ""})
    assert r.status_code == 400


def test_plan_whitespace_only(client):
    r = client.post("/plan", json={"domain": "   ", "problem": "   "})
    assert r.status_code == 400


# ─── POST /plan — body size limit ────────────────────────────────

def test_plan_oversized_body(client):
    huge = "x" * 300_000
    r = client.post(
        "/plan",
        json={"domain": huge, "problem": huge},
        headers={"content-length": str(600_000 + 100)},
    )
    assert r.status_code == 413
    assert r.json()["ok"] is False


# ─── POST /plan — successful planning ────────────────────────────

SAMPLE_DOMAIN = """(define (domain viaje)
  (:requirements :typing :fluents)
  (:types ciudad hotel vuelo)
  (:predicates (visitada ?c - ciudad))
  (:functions (dias_estancia ?c - ciudad))
  (:action ir :parameters (?c - ciudad) :precondition (not (visitada ?c)) :effect (visitada ?c))
)"""

SAMPLE_PROBLEM = """(define (problem viaje-test)
  (:domain viaje)
  (:objects c1 c2 - ciudad)
  (:init)
  (:goal (and (visitada c1) (visitada c2)))
)"""


def test_plan_valid_input_calls_subprocess(client, tmp_path):
    fake_plan = "(ir c1)\n(ir c2)\n"
    fake_stdout = "Found Plan:\n0.0: (ir c1)\n1.0: (ir c2)\nPlan-Length: 2"

    def mock_run(cmd, **kwargs):
        sp_idx = cmd.index("-sp")
        plan_path = cmd[sp_idx + 1]
        with open(plan_path, "w") as f:
            f.write(fake_plan)
        result = MagicMock()
        result.returncode = 0
        result.stdout = fake_stdout
        result.stderr = ""
        return result

    with patch("app.main.subprocess.run", side_effect=mock_run):
        r = client.post("/plan", json={"domain": SAMPLE_DOMAIN, "problem": SAMPLE_PROBLEM})

    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert len(data["plan"]) == 2
    assert data["plan"][0] == "(ir c1)"
    assert data["plan"][1] == "(ir c2)"
    assert "time_sec" in data
    assert data["time_sec"] >= 0


def test_plan_nonzero_exit_returns_error(client, tmp_path):
    def mock_run(cmd, **kwargs):
        result = MagicMock()
        result.returncode = 1
        result.stdout = "Error: invalid domain"
        result.stderr = ""
        return result

    with patch("app.main.subprocess.run", side_effect=mock_run):
        r = client.post("/plan", json={"domain": SAMPLE_DOMAIN, "problem": SAMPLE_PROBLEM})

    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is False
    assert len(data["plan"]) == 0
    assert "error" in data


def test_plan_timeout_returns_error(client, tmp_path):
    import subprocess as sp

    def mock_run(cmd, **kwargs):
        raise sp.TimeoutExpired(cmd, kwargs.get("timeout", 30))

    with patch("app.main.subprocess.run", side_effect=mock_run):
        r = client.post("/plan", json={"domain": SAMPLE_DOMAIN, "problem": SAMPLE_PROBLEM})

    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is False
    assert "timed out" in data["error"].lower()


def test_plan_no_plan_in_output(client, tmp_path):
    def mock_run(cmd, **kwargs):
        result = MagicMock()
        result.returncode = 0
        result.stdout = "Solving...\nNo solution found."
        result.stderr = ""
        return result

    with patch("app.main.subprocess.run", side_effect=mock_run):
        r = client.post("/plan", json={"domain": SAMPLE_DOMAIN, "problem": SAMPLE_PROBLEM})

    data = r.json()
    assert data["ok"] is False
    assert len(data["plan"]) == 0


# ─── API Key auth ─────────────────────────────────────────────────

def test_plan_with_api_key_required():
    with patch.dict(os.environ, {"PLANNER_API_KEY": "secret123"}):
        import importlib
        import app.main as m
        importlib.reload(m)
        c = TestClient(m.app)

        r = c.post("/plan", json={"domain": SAMPLE_DOMAIN, "problem": SAMPLE_PROBLEM})
        assert r.status_code == 401

        r = c.post(
            "/plan",
            json={"domain": SAMPLE_DOMAIN, "problem": SAMPLE_PROBLEM},
            headers={"X-API-Key": "wrong"},
        )
        assert r.status_code == 401


# ─── CORS ─────────────────────────────────────────────────────────

def test_cors_headers_present(client):
    r = client.options(
        "/plan",
        headers={
            "Origin": "http://localhost:4321",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" in r.headers or r.status_code == 200
