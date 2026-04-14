"""Tests for the PDDL domain normalization logic.

Run: cd planner-api && python -m pytest tests/test_normalize.py -v
"""

from __future__ import annotations

import pytest
from app.normalize import (
    fix_types_block,
    predicates_before_functions,
    normalize_domain_for_planner,
    _balanced_paren_block,
)


# ─── _balanced_paren_block ────────────────────────────────────────

class TestBalancedParenBlock:
    def test_simple_balanced(self):
        s = "(hello world)"
        block, after = _balanced_paren_block(s, 0)
        assert block == "(hello world)"
        assert after == len(s)

    def test_nested(self):
        s = "(a (b c) d)"
        block, after = _balanced_paren_block(s, 0)
        assert block == "(a (b c) d)"

    def test_inner_block(self):
        s = "prefix (inner) suffix"
        block, after = _balanced_paren_block(s, 7)
        assert block == "(inner)"
        assert after == 14

    def test_no_paren_at_index(self):
        block, after = _balanced_paren_block("hello", 0)
        assert block is None
        assert after is None

    def test_negative_index(self):
        block, after = _balanced_paren_block("(x)", -1)
        assert block is None

    def test_out_of_range(self):
        block, after = _balanced_paren_block("(x)", 10)
        assert block is None

    def test_unbalanced_returns_none(self):
        block, after = _balanced_paren_block("(missing close", 0)
        assert block is None


# ─── fix_types_block ─────────────────────────────────────────────

class TestFixTypesBlock:
    def test_no_types_block_unchanged(self):
        domain = "(define (domain d) (:predicates (p)))"
        assert fix_types_block(domain) == domain

    def test_self_referential_type_flattened(self):
        domain = "(define (domain d)\n\t(:types\n\t\tciudad - ciudad\n\t))"
        result = fix_types_block(domain)
        assert "ciudad - ciudad" not in result
        assert "ciudad" in result

    def test_multiple_types_preserved(self):
        domain = "(define (domain d)\n\t(:types\n\t\thotel - object\n\t\tciudad - object\n\t))"
        result = fix_types_block(domain)
        assert "hotel" in result
        assert "ciudad" in result

    def test_deduplicates_types(self):
        domain = "(define (domain d)\n\t(:types\n\t\tciudad - ciudad\n\t\tciudad - object\n\t))"
        result = fix_types_block(domain)
        # Should only appear once
        types_section = result[result.index("(:types"):result.index(")", result.index("(:types")) + 1]
        assert types_section.count("ciudad") == 1

    def test_mixed_self_ref_and_normal(self):
        domain = "(define (domain d)\n\t(:types\n\t\tciudad - ciudad\n\t\thotel - object\n\t\tvuelo - object\n\t))"
        result = fix_types_block(domain)
        assert "ciudad" in result
        assert "hotel" in result
        assert "vuelo" in result


# ─── predicates_before_functions ─────────────────────────────────

class TestPredicatesBeforeFunctions:
    def test_already_correct_order(self):
        domain = "(define (domain d)\n\t(:predicates (p))\n\t(:functions (f)))"
        assert predicates_before_functions(domain) == domain

    def test_swaps_when_functions_first(self):
        domain = "(define (domain d)\n\t(:functions (f ?x))\n\t(:predicates (p ?y)))"
        result = predicates_before_functions(domain)
        ip = result.find("(:predicates")
        ifun = result.find("(:functions")
        assert ip < ifun, "predicates should come before functions"

    def test_no_functions_block(self):
        domain = "(define (domain d)\n\t(:predicates (p)))"
        assert predicates_before_functions(domain) == domain

    def test_no_predicates_block(self):
        domain = "(define (domain d)\n\t(:functions (f)))"
        assert predicates_before_functions(domain) == domain


# ─── normalize_domain_for_planner (integration) ──────────────────

class TestNormalizeDomainForPlanner:
    def test_empty_domain(self):
        result = normalize_domain_for_planner("")
        assert result == ""

    def test_plain_domain_unchanged(self):
        domain = "(define (domain d)\n\t(:predicates (p)))"
        assert normalize_domain_for_planner(domain) == domain

    def test_fixes_self_ref_and_reorders(self):
        domain = (
            "(define (domain viaje)\n"
            "\t(:types\n\t\tciudad - ciudad\n\t)\n"
            "\t(:functions (dias ?c - ciudad))\n"
            "\t(:predicates (visitada ?c - ciudad))\n"
            ")"
        )
        result = normalize_domain_for_planner(domain)
        # Self-ref removed
        assert "ciudad - ciudad" not in result
        # Predicates before functions
        ip = result.find("(:predicates")
        ifun = result.find("(:functions")
        if ip >= 0 and ifun >= 0:
            assert ip < ifun

    def test_preserves_actions(self):
        domain = (
            "(define (domain d)\n"
            "\t(:types ciudad - ciudad)\n"
            "\t(:predicates (visitada ?c))\n"
            "\t(:action ir :parameters (?c) :effect (visitada ?c))\n"
            ")"
        )
        result = normalize_domain_for_planner(domain)
        assert "(:action ir" in result
