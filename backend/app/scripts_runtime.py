"""Runtime helpers used by routers."""
from __future__ import annotations

import sys
from pathlib import Path

# Make backend/scripts/ importable so routers can reuse its helpers
# (e.g. Excel template generation) without duplicating code under app/.
# __file__ = .../backend/app/scripts_runtime.py  =>  parents[1] = .../backend
_SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))


def ensure_template(out_path: str | None = None) -> str:
    """Generate the Excel import template if missing; return its path."""
    from gen_template import main as _gen_main  # type: ignore[import-not-found]

    target = Path(out_path) if out_path else _SCRIPTS_DIR / "excel_import_template.xlsx"
    if target.exists():
        return str(target)
    return _gen_main(str(target))