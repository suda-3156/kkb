"""Check that tool versions restated outside mise.toml agree with it.

mise.toml is where tool versions are written, and local development and CI
both install from it. Some files cannot read it (go.mod, Dockerfiles) and have
to restate a version; this script fails when one of them drifts.

Run from anywhere: python3 scripts/check_tool_versions.py
"""

import re
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# How the restated version must relate to the mise.toml version.
MODES = {
    "eq": lambda c: c == 0,
    "le": lambda c: c <= 0,
    "lt": lambda c: c < 0,
    "ge": lambda c: c >= 0,
    "gt": lambda c: c > 0,
}


@dataclass(frozen=True)
class Check:
    tool: str  # key under [tools] in mise.toml
    path: str  # relative to the repository root
    pattern: str  # regex whose first group captures the version
    mode: str  # key of MODES


CHECKS = [
    # The go directive is the minimum Go the module needs, not the toolchain
    # to use, so it only has to stay at or below what mise installs. CI sets
    # GOTOOLCHAIN=local, so a go.mod above mise.toml fails there too.
    Check("go", "go/go.mod", r"(?m)^go (\S+)$", "le"),
    # The official golang images set GOTOOLCHAIN=local, so they must carry the
    # same Go that the code was checked with.
    Check("go", "go/dockerfile", r"(?m)^FROM golang:([^-@\s]+)-alpine", "eq"),
    Check("go", "containers/backend.dockerfile", r"(?m)^FROM golang:([^-@\s]+)-alpine", "eq"),
    Check("go", "containers/migrate.dockerfile", r"(?m)^FROM golang:([^-@\s]+)-alpine", "eq"),
    Check("bun", "containers/next.dockerfile", r"(?m)^FROM oven/bun:([^-@\s]+)-alpine", "eq"),
]


def parse_version(version: str) -> tuple[int, ...]:
    if not re.fullmatch(r"\d+(\.\d+)*", version):
        raise ValueError(f"not a dotted numeric version: {version!r}")
    return tuple(int(part) for part in version.split("."))


def compare_versions(a: str, b: str) -> int:
    """Return -1, 0 or 1 as a is below, equal to or above b.

    Missing components count as zero, so "1.27" equals "1.27.0".
    """
    pa, pb = parse_version(a), parse_version(b)
    width = max(len(pa), len(pb))
    pa += (0,) * (width - len(pa))
    pb += (0,) * (width - len(pb))
    return (pa > pb) - (pa < pb)


def check_version(actual: str, expected: str, mode: str) -> bool:
    """Report whether actual relates to expected as mode says."""
    if mode not in MODES:
        raise ValueError(f"unknown mode: {mode!r}")
    return MODES[mode](compare_versions(actual, expected))


def run(root: Path, checks: list[Check]) -> list[str]:
    """Run checks against the files under root and return the failures."""
    with open(root / "mise.toml", "rb") as f:
        tools = tomllib.load(f).get("tools", {})

    failures = []
    for check in checks:
        expected = tools.get(check.tool)
        if expected is None:
            failures.append(f"{check.path}: mise.toml has no [tools] entry for {check.tool}")
            continue
        found = re.findall(check.pattern, (root / check.path).read_text())
        if not found:
            # A pattern that matches nothing would otherwise pass silently
            # forever after the file is restructured.
            failures.append(f"{check.path}: no {check.tool} version found (pattern {check.pattern!r})")
            continue
        for actual in found:
            try:
                ok = check_version(actual, str(expected), check.mode)
            except ValueError as e:
                failures.append(f"{check.path}: {e}")
                continue
            if not ok:
                failures.append(
                    f"{check.path}: {check.tool} {actual} is not {check.mode} mise.toml {expected}"
                )
    return failures


def main() -> int:
    failures = run(ROOT, CHECKS)
    for failure in failures:
        print(failure, file=sys.stderr)
    if failures:
        print("Tool versions disagree with mise.toml.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
