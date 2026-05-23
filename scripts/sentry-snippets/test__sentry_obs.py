"""
Unit tests for `_sentry_obs.py` — the canonical Python observability
helper. These run as a standalone unittest module so any backend repo
can pull the file (alongside `_sentry_obs.py`) and verify the helper
without needing pytest.

Run from this directory:

    python -m unittest test__sentry_obs.py

The tests stub out the `sentry_sdk` import to keep the suite hermetic.
That is the right tradeoff for unit-level coverage of the pure-Python
parts (scrubber, env-aware rate resolver, before_send chain, contextvar
binding); end-to-end SDK behaviour is exercised separately when each
backend's integration tests run with a Spotlight DSN.
"""

import os
import unittest
from unittest import mock

import _sentry_obs as obs


# ── PII scrubbing ──────────────────────────────────────────────────────


class TestPIIScrubber(unittest.TestCase):
    """The `before_send` chain composes service tagging + PII scrubbing.
    These tests pin the exact set of keys we redact and the shape of the
    output the SDK ships, so a future "let's add another sensitive key"
    PR can lock the new contract in here."""

    def test_extra_dict_redacts_known_sensitive_keys(self):
        event = {"extra": {"username": "alice", "password": "hunter2",
                           "api_key": "k-123", "model": "ResNet"}}
        out = obs._scrub_event(event)
        self.assertEqual(out["extra"]["username"], "alice")
        self.assertEqual(out["extra"]["password"], "[Filtered]")
        self.assertEqual(out["extra"]["api_key"], "[Filtered]")
        self.assertEqual(out["extra"]["model"], "ResNet")

    def test_redaction_is_case_insensitive_and_matches_substrings(self):
        event = {"extra": {
            "Authorization": "Bearer xxx",
            "X-API-KEY": "yyy",
            "user_token": "zzz",
            "harmless": "ok",
        }}
        out = obs._scrub_event(event)
        self.assertEqual(out["extra"]["Authorization"], "[Filtered]")
        self.assertEqual(out["extra"]["X-API-KEY"], "[Filtered]")
        self.assertEqual(out["extra"]["user_token"], "[Filtered]")
        self.assertEqual(out["extra"]["harmless"], "ok")

    def test_nested_dicts_are_walked(self):
        event = {"extra": {"request": {"headers": {"cookie": "abc"}}}}
        out = obs._scrub_event(event)
        self.assertEqual(out["extra"]["request"]["headers"]["cookie"], "[Filtered]")

    def test_lists_of_dicts_are_walked(self):
        event = {"extra": {"items": [{"token": "t1"}, {"label": "ok"}]}}
        out = obs._scrub_event(event)
        self.assertEqual(out["extra"]["items"][0]["token"], "[Filtered]")
        self.assertEqual(out["extra"]["items"][1]["label"], "ok")

    def test_request_headers_are_redacted_in_dict_form(self):
        event = {"request": {"headers": {"authorization": "Bearer x", "ua": "curl"}}}
        out = obs._scrub_event(event)
        self.assertEqual(out["request"]["headers"]["authorization"], "[Filtered]")
        self.assertEqual(out["request"]["headers"]["ua"], "curl")

    def test_request_cookies_are_dropped_entirely(self):
        event = {"request": {"cookies": "session=abc; token=xyz"}}
        out = obs._scrub_event(event)
        self.assertEqual(out["request"]["cookies"], "[Filtered]")

    def test_breadcrumb_data_is_walked(self):
        event = {"breadcrumbs": {"values": [
            {"category": "auth", "data": {"password": "hunter2", "user": "alice"}},
            {"category": "noop"},
        ]}}
        out = obs._scrub_event(event)
        self.assertEqual(out["breadcrumbs"]["values"][0]["data"]["password"], "[Filtered]")
        self.assertEqual(out["breadcrumbs"]["values"][0]["data"]["user"], "alice")

    def test_tag_list_form_redacts_sensitive_keys(self):
        event = {"tags": [["service", "tfg"], ["api_key", "secret"]]}
        out = obs._scrub_event(event)
        self.assertIn(["service", "tfg"], out["tags"])
        self.assertIn(["api_key", "[Filtered]"], out["tags"])

    def test_tag_dict_form_redacts_sensitive_keys(self):
        event = {"tags": {"service": "tfg", "api_key": "secret"}}
        out = obs._scrub_event(event)
        self.assertEqual(out["tags"]["service"], "tfg")
        self.assertEqual(out["tags"]["api_key"], "[Filtered]")

    def test_span_data_is_walked(self):
        event = {"spans": [{"data": {"token": "x", "duration": 1.2}}]}
        out = obs._scrub_event(event)
        self.assertEqual(out["spans"][0]["data"]["token"], "[Filtered]")
        self.assertEqual(out["spans"][0]["data"]["duration"], 1.2)

    def test_unknown_event_shapes_pass_through_unchanged(self):
        # Non-dict tags, missing fields, etc. — never crash on novel shapes.
        event = {"tags": "freeform-string", "extra": None}
        out = obs._scrub_event(event)
        self.assertEqual(out["tags"], "freeform-string")
        self.assertIsNone(out["extra"])


# ── before_send composition: tagger + scrubber ─────────────────────────


class TestBeforeSendChain(unittest.TestCase):
    def test_service_tag_added_in_list_form(self):
        hook = obs._make_before_send("tfg-polyps")
        out = hook({}, None)
        self.assertIn(["service", "tfg-polyps"], out["tags"])

    def test_session_id_tag_added_when_contextvar_is_set(self):
        token = obs._SESSION_ID.set("sess-xyz")
        try:
            hook = obs._make_before_send("tfg-polyps")
            out = hook({}, None)
            self.assertIn(["session_id", "sess-xyz"], out["tags"])
        finally:
            obs._SESSION_ID.reset(token)

    def test_session_id_tag_omitted_when_contextvar_unset(self):
        hook = obs._make_before_send("tfg-polyps")
        out = hook({}, None)
        keys = [t[0] for t in out["tags"] if isinstance(t, list)]
        self.assertNotIn("session_id", keys)

    def test_pii_scrub_runs_after_tagging(self):
        hook = obs._make_before_send("svc")
        out = hook({"extra": {"password": "hunter2"}}, None)
        self.assertEqual(out["extra"]["password"], "[Filtered]")
        self.assertIn(["service", "svc"], out["tags"])

    def test_chain_is_robust_against_malformed_events(self):
        hook = obs._make_before_send("svc")
        # Should not raise on weird shapes.
        for event in [{}, {"extra": "string"}, {"tags": 42}, {"breadcrumbs": "wat"}]:
            out = hook(event, None)
            self.assertIsInstance(out, dict)


# ── Env-aware sample rate resolver ─────────────────────────────────────


class TestSampleRateResolver(unittest.TestCase):
    def test_explicit_env_var_wins(self):
        with mock.patch.dict(os.environ, {"SENTRY_TRACES_SAMPLE_RATE": "0.25"}, clear=False):
            self.assertEqual(
                obs._resolve_rate("SENTRY_TRACES_SAMPLE_RATE", "production"),
                0.25,
            )

    def test_production_default_is_zero_point_one(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("SENTRY_TRACES_SAMPLE_RATE", None)
            self.assertEqual(
                obs._resolve_rate("SENTRY_TRACES_SAMPLE_RATE", "production"),
                0.1,
            )

    def test_local_dev_default_is_one(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("SENTRY_TRACES_SAMPLE_RATE", None)
            self.assertEqual(
                obs._resolve_rate("SENTRY_TRACES_SAMPLE_RATE", "local-dev"),
                1.0,
            )

    def test_invalid_value_falls_back_to_env_default(self):
        with mock.patch.dict(os.environ, {"SENTRY_TRACES_SAMPLE_RATE": "not-a-number"}, clear=False):
            self.assertEqual(
                obs._resolve_rate("SENTRY_TRACES_SAMPLE_RATE", "production"),
                0.1,
            )
            self.assertEqual(
                obs._resolve_rate("SENTRY_TRACES_SAMPLE_RATE", "staging"),
                1.0,
            )

    def test_empty_string_treated_as_unset(self):
        with mock.patch.dict(os.environ, {"SENTRY_TRACES_SAMPLE_RATE": ""}, clear=False):
            self.assertEqual(
                obs._resolve_rate("SENTRY_TRACES_SAMPLE_RATE", "production"),
                0.1,
            )


# ── Session-id middleware ──────────────────────────────────────────────


class TestSessionIdMiddleware(unittest.IsolatedAsyncioTestCase):
    async def test_binds_header_to_contextvar_for_request_scope(self):
        captured: dict[str, str | None] = {}

        async def app(scope, receive, send):
            captured["sid"] = obs._SESSION_ID.get()

        mw = obs.SessionIdMiddleware(app)
        scope = {"type": "http", "headers": [(b"x-session-id", b"sess-abc")]}
        await mw(scope, lambda: None, lambda _: None)
        self.assertEqual(captured["sid"], "sess-abc")

    async def test_resets_contextvar_after_request_completes(self):
        async def app(scope, receive, send):
            return None

        mw = obs.SessionIdMiddleware(app)
        scope = {"type": "http", "headers": [(b"x-session-id", b"sess-abc")]}
        await mw(scope, lambda: None, lambda _: None)
        self.assertIsNone(obs._SESSION_ID.get())

    async def test_no_header_leaves_contextvar_unset(self):
        captured: dict[str, str | None] = {}

        async def app(scope, receive, send):
            captured["sid"] = obs._SESSION_ID.get()

        mw = obs.SessionIdMiddleware(app)
        scope = {"type": "http", "headers": []}
        await mw(scope, lambda: None, lambda _: None)
        self.assertIsNone(captured["sid"])

    async def test_passes_through_lifespan_scope_unchanged(self):
        called: dict[str, bool] = {"called": False}

        async def app(scope, receive, send):
            called["called"] = True

        mw = obs.SessionIdMiddleware(app)
        await mw({"type": "lifespan"}, lambda: None, lambda _: None)
        self.assertTrue(called["called"])


if __name__ == "__main__":
    unittest.main()
