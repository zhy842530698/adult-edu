.PHONY: help backend admin mp seed test verify template smoke clean install

PYTHON ?= python3
PIP ?= pip3
BACKEND_DIR := backend
ADMIN_DIR := admin-web
MP_DIR := miniprogram

# Use venv python when available so we don't depend on system packages.
VENV_PY := $(shell test -x .venv/bin/python && echo .venv/bin/python || echo $(PYTHON))
PIP_VENV := $(shell test -x .venv/bin/pip && echo .venv/bin/pip || echo $(PIP))

help:
	@echo "可用命令："
	@echo "  make install   安装后端依赖"
	@echo "  make seed      初始化数据库 + 灌种子数据"
	@echo "  make backend   启动后端 (http://localhost:8000)"
	@echo "  make admin     启动运营后台 (http://localhost:5173)"
	@echo "  make mp        启动小程序 (需要微信开发者工具)"
	@echo "  make test      跑后端 pytest 测试"
	@echo "  make smoke     跑 curl 端到端 smoke"
	@echo "  make verify    seed + 启动后端 + smoke 全绿校验"
	@echo "  make template  生成 Excel 导入模板 docs/excel-import-template.xlsx"

install:
	$(PYTHON) -m venv .venv
	. .venv/bin/activate && $(PIP) install -r $(BACKEND_DIR)/requirements.txt

seed:
	cd $(BACKEND_DIR) && bash scripts/init_db.sh

backend:
	cd $(BACKEND_DIR) && $(VENV_PY) -m uvicorn app.main:app --reload --port 8000

admin:
	cd $(ADMIN_DIR) && npm install && npm run dev

mp:
	cd $(MP_DIR) && npm install && npm run dev:weapp

test:
	cd $(BACKEND_DIR) && $(VENV_PY) -m pytest -q

smoke:
	bash docs/smoke.sh

verify: seed
	@echo "verify: seed passed. Start backend in another terminal (make backend) then run 'make smoke'."

template:
	cd $(BACKEND_DIR) && $(VENV_PY) scripts/gen_template.py ../docs/excel-import-template.xlsx

clean:
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
	rm -f $(BACKEND_DIR)/adult_edu.db $(BACKEND_DIR)/adult_edu_test.db