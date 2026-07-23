"""Deterministic Azure Retail Prices fetcher.

Fetches a SCOPED subset of the Azure Retail Prices API, compares it with the
previous snapshot, and writes:
  - data/latest/<scope>.json          (current snapshot, one file per scope)
  - data/diffs/<YYYY-MM-DD>/<ts>.json (only when changes are detected)

This script is intentionally boring. No AI, no cleverness. Claude Code treats
it as read-only; changes to scopes or logic go through a human-approved issue.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

API_URL = "https://prices.azure.com/api/retail/prices"
API_VERSION = "2023-01-01-preview"

# Deliberately scoped: fetching the whole API (~600k items) every hour would
# blow up repo size and Actions minutes. Extend scopes via issues, one at a time.
SCOPES: dict[str, str] = {
    "vm-eu-west": "serviceName eq 'Virtual Machines' and armRegionName eq 'westeurope' and priceType eq 'Consumption'",
    "storage-eu-west": "serviceName eq 'Storage' and armRegionName eq 'westeurope' and priceType eq 'Consumption'",
    "openai-eu": "serviceName eq 'Azure OpenAI' and (armRegionName eq 'westeurope' or armRegionName eq 'swedencentral' or armRegionName eq 'francecentral')",
}

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
KEY_FIELDS = ("skuId", "meterId", "type", "reservationTerm")
TRACKED_FIELDS = ("retailPrice", "unitPrice", "unitOfMeasure", "productName", "skuName", "meterName", "armRegionName")


def fetch_scope(odata_filter: str) -> list[dict]:
    items: list[dict] = []
    url: str | None = f"{API_URL}?api-version={API_VERSION}&$filter={odata_filter}"
    while url:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        payload = resp.json()
        items.extend(payload.get("Items", []))
        url = payload.get("NextPageLink")
    return items


def index_by_key(items: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for it in items:
        key = "|".join(str(it.get(f, "")) for f in KEY_FIELDS)
        out[key] = {f: it.get(f) for f in TRACKED_FIELDS}
    return out


def diff_snapshots(old: dict[str, dict], new: dict[str, dict]) -> dict:
    added = [k for k in new if k not in old]
    removed = [k for k in old if k not in new]
    changed = []
    for k in new:
        if k in old and old[k] != new[k]:
            changed.append({"key": k, "before": old[k], "after": new[k]})
    return {"added": [{ "key": k, **new[k]} for k in added],
            "removed": [{"key": k, **old[k]} for k in removed],
            "changed": changed}


def main() -> int:
    now = datetime.now(timezone.utc)
    latest_dir = DATA_DIR / "latest"
    latest_dir.mkdir(parents=True, exist_ok=True)
    any_changes = False

    for scope, odata_filter in SCOPES.items():
        print(f"[fetch] {scope}")
        new_index = index_by_key(fetch_scope(odata_filter))

        latest_file = latest_dir / f"{scope}.json"
        old_index = json.loads(latest_file.read_text()) if latest_file.exists() else {}

        d = diff_snapshots(old_index, new_index)
        n_changes = len(d["added"]) + len(d["removed"]) + len(d["changed"])
        print(f"  items={len(new_index)} added={len(d['added'])} removed={len(d['removed'])} changed={len(d['changed'])}")

        if n_changes > 0:
            any_changes = True
            diff_dir = DATA_DIR / "diffs" / now.strftime("%Y-%m-%d")
            diff_dir.mkdir(parents=True, exist_ok=True)
            diff_file = diff_dir / f"{now.strftime('%H%M')}-{scope}.json"
            diff_file.write_text(json.dumps({"scope": scope, "at": now.isoformat(), **d}, indent=1))

        latest_file.write_text(json.dumps(new_index, indent=0, sort_keys=True))

    last_checked_file = latest_dir / "last-checked.json"
    last_checked_file.write_text(json.dumps({"at": now.isoformat()}, indent=1))

    if any_changes:
        import subprocess
        digest_script = Path(__file__).resolve().parent / "generate-digest.js"
        result = subprocess.run(["node", str(digest_script)], capture_output=True, text=True)
        print(result.stdout, end="")
        if result.returncode != 0:
            print(result.stderr, file=sys.stderr)
        feed_script = Path(__file__).resolve().parent / "generate-feed.js"
        result = subprocess.run(["node", str(feed_script)], capture_output=True, text=True)
        print(result.stdout, end="")
        if result.returncode != 0:
            print(result.stderr, file=sys.stderr)

    print("changes detected" if any_changes else "no changes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
