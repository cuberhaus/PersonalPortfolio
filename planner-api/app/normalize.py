"""
ENHSP rejects some PDDL that appears in course domains:
- Self-referential types (ciudad - ciudad) → flatten to ciudad hotel ...
- :functions before :predicates → swap so :predicates comes first
"""

from __future__ import annotations

import re


def _balanced_paren_block(s: str, open_idx: int) -> tuple[str, int] | tuple[None, None]:
    if open_idx < 0 or open_idx >= len(s) or s[open_idx] != "(":
        return None, None
    depth = 0
    for i in range(open_idx, len(s)):
        if s[i] == "(":
            depth += 1
        elif s[i] == ")":
            depth -= 1
            if depth == 0:
                return s[open_idx : i + 1], i + 1
    return None, None


def fix_types_block(domain: str) -> str:
    m = re.search(r"\(:types\b", domain)
    if not m:
        return domain
    block, after = _balanced_paren_block(domain, m.start())
    if not block:
        return domain
    inner = block[block.index("(:types") + len("(:types") :].strip()
    inner = inner.rstrip(")").strip()
    types: list[str] = []
    for line in inner.splitlines():
        line = line.strip()
        if not line:
            continue
        sm = re.match(r"^(\w+)\s+-\s+\1\s*$", line)
        if sm:
            types.append(sm.group(1))
            continue
        parts = line.split()
        j = 0
        while j < len(parts):
            if j + 2 < len(parts) and parts[j + 1] == "-":
                types.append(parts[j])
                j += 3
            else:
                if parts[j] not in ("-",):
                    types.append(parts[j])
                j += 1
    seen: set[str] = set()
    uniq = [t for t in types if t and t not in seen and not seen.add(t)]  # type: ignore
    new_block = "(:types\n\t\t" + " ".join(uniq) + "\n\t)"
    return domain[: m.start()] + new_block + domain[after:]


def predicates_before_functions(domain: str) -> str:
    ip = domain.find("(:predicates")
    if ip < 0:
        return domain
    ifun = domain.find("(:functions")
    if ifun < 0 or ip < ifun:
        return domain
    pred_block, pafter = _balanced_paren_block(domain, ip)
    fun_block, fafter = _balanced_paren_block(domain, ifun)
    if not pred_block or not fun_block:
        return domain
    before = domain[:ifun]
    between = domain[fafter:ip]
    after = domain[pafter:]
    return before + pred_block + between + fun_block + after


def normalize_domain_for_planner(domain: str) -> str:
    d = fix_types_block(domain)
    d = predicates_before_functions(d)
    return d
