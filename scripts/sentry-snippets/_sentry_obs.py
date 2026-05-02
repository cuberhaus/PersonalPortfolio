"""
Phase 14 (Option A) — drop-in observability hook for Python backends.

This file is the canonical source. It is COPIED verbatim into each
demo backend repo (TFG, bitsXlaMarato, projectA, projectA2, CAIM,
SBC_IA, desastresIA, planner-api, Draculin-Backend) so each docker
image is self-contained — there's no shared volume across repos.

Usage at the top of `app.py` / `main.py` / Django `settings.py`:

    from _sentry_obs import init_observability
    init_observability(service="<slug>")

What it does (all behaviour is non-fatal — runs only when the
required env / packages are present):

1. Initialises `sentry_sdk` if `SENTRY_DSN` is set and the package is
   importable. Tags every event with `service: <slug>` so the same
   shared Sentry project can host all 9 backends.
2. Replaces the root logger with a JSON-line handler so every line
   on stdout is a single JSON object the PersonalPortfolio
   `scripts/log-relay/` sidecar can forward into the in-page debug
   overlay verbatim (`{level, ns, msg, ts}`).

KEEP THIS FILE IN SYNC across all backend repos. To resync:

    cp PersonalPortfolio/scripts/sentry-snippets/_sentry_obs.py \\
       <backend-repo>/<backend-dir>/_sentry_obs.py
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
import sys
import time
from typing import Any, Iterator


_LEVEL_MAP = {
    logging.DEBUG: "trace",
    logging.INFO: "info",
    logging.WARNING: "warn",
    logging.ERROR: "error",
    logging.CRITICAL: "error",
}


class JsonLineHandler(logging.Handler):
    """Log handler that writes one JSON object per line to stdout."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            line = {
                "level": _LEVEL_MAP.get(record.levelno, "info"),
                "ns": record.name,
                "msg": record.getMessage(),
                "ts": time.time(),
            }
            sys.stdout.write(json.dumps(line) + "\n")
            sys.stdout.flush()
        except Exception:
            # Never let a logging failure crash the request handler.
            pass


def _make_service_tagger(service: str):
    """Return a `before_send` hook that stamps `tags.service = <slug>`
    on every event/transaction.

    Why a hook instead of `sentry_sdk.set_tag()`?

    `set_tag` writes to the *current* scope. In sentry-sdk 2.0–2.20 the
    ASGI / WSGI integrations fork a fresh isolation scope per request
    that does **not** inherit init-time tags, so the slug never reaches
    transaction events. The hook runs at envelope creation, after every
    scope merge, so the tag is guaranteed to land on the wire payload
    regardless of SDK version (1.x, 2.x — old or new).

    Wire format note: events use `tags` as a list of [key, value] pairs
    (per Sentry's protocol) but some integrations preserve the dict form
    `{key: value}`. Handle both.
    """

    def _hook(event, _hint):
        tags = event.setdefault("tags", [])
        if isinstance(tags, list):
            if not any(
                isinstance(t, (list, tuple)) and len(t) >= 1 and t[0] == "service"
                for t in tags
            ):
                tags.append(["service", service])
        elif isinstance(tags, dict):
            tags.setdefault("service", service)
        return event

    return _hook


def init_observability(service: str) -> None:
    """Initialise Sentry SDK + JSON-line stdout logging.

    `service` is the demo slug (e.g. ``"tfg-polyps"``) and shows up
    as ``tags.service`` in Sentry events for filtering.

    Safe to call multiple times — Sentry init is idempotent and the
    log handler swap is too.
    """
    dsn = os.getenv("SENTRY_DSN")
    if dsn:
        try:
            import sentry_sdk  # type: ignore[import-not-found]

            tagger = _make_service_tagger(service)
            init_kwargs = dict(
                dsn=dsn,
                environment=os.environ.get("SENTRY_ENVIRONMENT", "local-dev"),
                release=os.environ.get("SENTRY_RELEASE", "local-dev"),
                traces_sample_rate=float(
                    os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "1.0"),
                ),
                # Transaction-based profiling — sentry-sdk 1.18+
                profiles_sample_rate=float(
                    os.environ.get("SENTRY_PROFILES_SAMPLE_RATE", "1.0"),
                ),
                # Continuous session profiling — sentry-sdk 2.21+. Older
                # SDKs raise TypeError on this kwarg, so we strip it on
                # the retry below.
                profile_session_sample_rate=float(
                    os.environ.get("SENTRY_PROFILE_SESSION_SAMPLE_RATE", "1.0"),
                ),
                send_default_pii=False,
                before_send=tagger,
                before_send_transaction=tagger,
            )
            try:
                sentry_sdk.init(**init_kwargs)
            except TypeError:
                # Unknown kwarg on older SDK — drop the newest one and retry
                # so we don't lose the rest of the config.
                init_kwargs.pop("profile_session_sample_rate", None)
                sentry_sdk.init(**init_kwargs)
            sentry_sdk.set_tag("service", service)
        except ImportError:
            pass

    logging.basicConfig(
        level=logging.INFO,
        handlers=[JsonLineHandler()],
        force=True,
    )


# ── Per-handler instrumentation helpers ────────────────────────────────
#
# Backends use these so each `app.py` / `main.py` / `views.py` doesn't
# have to repeat the `try: import sentry_sdk` + nullcontext shim. All
# three are no-ops when `sentry_sdk` is missing OR when no DSN was set
# (the SDK's own no-op hub already handles the "DSN missing" case, this
# layer also handles the "package missing" case).
#
# Usage:
#
#     from _sentry_obs import tag, breadcrumb, span
#
#     tag("model", req.model_name)
#     breadcrumb("ml", "predict received", model_file=req.model_file)
#     with span("ml.infer", description="FasterRCNN forward pass",
#               model=req.model_name):
#         output = model(tensor)
#
# `span(...)` returns a context manager either way. Any kwargs are
# forwarded as `set_data(k, v)` on the span (they show up in the trace
# waterfall) — Sentry will reject unserialisable values, so we wrap the
# `set_data` call in try/except as well.


try:
    import sentry_sdk as _sentry_sdk  # type: ignore[import-not-found]
except ImportError:
    _sentry_sdk = None  # type: ignore[assignment]


def tag(key: str, value: Any) -> None:
    """Add a tag to the current Sentry scope. No-op when SDK absent."""
    if _sentry_sdk is None:
        return
    try:
        _sentry_sdk.set_tag(key, value)
    except Exception:
        pass


def breadcrumb(
    category: str,
    message: str,
    *,
    level: str = "info",
    **data: Any,
) -> None:
    """Add a Sentry breadcrumb. Any extra kwargs land in `data`."""
    if _sentry_sdk is None:
        return
    try:
        _sentry_sdk.add_breadcrumb(
            category=category,
            message=message,
            level=level,
            data=data or None,
        )
    except Exception:
        pass


@contextlib.contextmanager
def span(op: str, description: str | None = None, **data: Any) -> Iterator[Any]:
    """Start a Sentry span. Yields the span (or `None` when SDK absent).

    All `data` kwargs are recorded with `span.set_data(k, v)` for the
    waterfall view.
    """
    if _sentry_sdk is None:
        yield None
        return
    try:
        cm = _sentry_sdk.start_span(op=op, description=description)
    except Exception:
        # Any SDK-level failure → degrade to no-op rather than crashing
        # the request handler.
        yield None
        return
    with cm as s:
        if s is not None and data:
            for k, v in data.items():
                try:
                    s.set_data(k, v)
                except Exception:
                    pass
        yield s
