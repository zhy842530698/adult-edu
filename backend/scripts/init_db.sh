#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Prefer project venv if available so we use the right dependency set.
if [ -x "../.venv/bin/python" ]; then
  PYTHON="../.venv/bin/python"
elif [ -n "$VIRTUAL_ENV" ] && [ -x "$VIRTUAL_ENV/bin/python" ]; then
  PYTHON="$VIRTUAL_ENV/bin/python"
else
  PYTHON=${PYTHON:-python3}
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

$PYTHON -m alembic upgrade head
$PYTHON -m app.seed.seed_data
echo "[init_db] 数据库已初始化：$(pwd)/adult_edu.db"
