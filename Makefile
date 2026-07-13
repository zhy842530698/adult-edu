
.DEFAULT_GOAL := help

.PHONY: help install seed \
	backend backend-stop backend-restart backend-status backend-logs \
	admin admin-stop admin-restart admin-status admin-logs \
	mp test smoke verify template clean

PYTHON ?= python3

ROOT_DIR := $(abspath $(CURDIR))

BACKEND_DIR := $(ROOT_DIR)/backend
ADMIN_DIR := $(ROOT_DIR)/admin-web
MP_DIR := $(ROOT_DIR)/miniprogram

VENV_DIR := $(ROOT_DIR)/.venv
VENV_PY := $(VENV_DIR)/bin/python

BACKEND_PID := $(ROOT_DIR)/.backend.pid
BACKEND_LOG := $(ROOT_DIR)/backend.log

ADMIN_PID := $(ROOT_DIR)/.admin.pid
ADMIN_LOG := $(ROOT_DIR)/admin.log


help:
	@echo "可用命令："
	@echo ""
	@echo "  make install          创建虚拟环境并安装后端依赖"
	@echo "  make seed             初始化数据库并灌入种子数据"
	@echo ""
	@echo "  make backend          后台启动后端"
	@echo "  make backend-stop     停止后端"
	@echo "  make backend-restart  重启后端"
	@echo "  make backend-status   查看后端状态"
	@echo "  make backend-logs     查看后端日志"
	@echo ""
	@echo "  make admin            后台启动运营后台"
	@echo "  make admin-stop       停止运营后台"
	@echo "  make admin-restart    重启运营后台"
	@echo "  make admin-status     查看运营后台状态"
	@echo "  make admin-logs       查看运营后台日志"
	@echo ""
	@echo "  make mp               启动微信小程序编译"
	@echo "  make test             运行后端 pytest"
	@echo "  make smoke            运行端到端 smoke 测试"
	@echo "  make verify           初始化数据库、启动后端并运行 smoke"
	@echo "  make template         生成 Excel 导入模板"
	@echo "  make clean            清理缓存、日志和测试数据库"


install:
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "正在创建 Python 虚拟环境..."; \
		$(PYTHON) -m venv "$(VENV_DIR)"; \
	fi
	@"$(VENV_PY)" -m pip install --upgrade pip
	@"$(VENV_PY)" -m pip install -r "$(BACKEND_DIR)/requirements.txt"


seed:
	@if [ ! -x "$(VENV_PY)" ]; then \
		echo "未找到虚拟环境，请先执行：make install"; \
		exit 1; \
	fi
	@cd "$(BACKEND_DIR)" && bash scripts/init_db.sh


backend:
	@if [ ! -x "$(VENV_PY)" ]; then \
		echo "未找到虚拟环境，请先执行：make install"; \
		exit 1; \
	fi
	@if [ -f "$(BACKEND_PID)" ] && kill -0 $$(cat "$(BACKEND_PID)") 2>/dev/null; then \
		echo "后端已经运行"; \
		echo "PID：$$(cat "$(BACKEND_PID)")"; \
		echo "地址：http://localhost:8000"; \
	else \
		rm -f "$(BACKEND_PID)"; \
		echo "正在后台启动后端..."; \
		cd "$(BACKEND_DIR)" && \
		nohup setsid "$(VENV_PY)" -m uvicorn app.main:app \
			--host 0.0.0.0 \
			--port 8000 \
			> "$(BACKEND_LOG)" 2>&1 & \
		echo $$! > "$(BACKEND_PID)"; \
		sleep 2; \
		if kill -0 $$(cat "$(BACKEND_PID)") 2>/dev/null; then \
			echo "后端启动成功"; \
			echo "PID：$$(cat "$(BACKEND_PID)")"; \
			echo "地址：http://localhost:8000"; \
			echo "日志：$(BACKEND_LOG)"; \
		else \
			echo "后端启动失败"; \
			echo "请查看日志：$(BACKEND_LOG)"; \
			rm -f "$(BACKEND_PID)"; \
			tail -n 30 "$(BACKEND_LOG)" 2>/dev/null || true; \
			exit 1; \
		fi; \
	fi


backend-stop:
	@if [ ! -f "$(BACKEND_PID)" ]; then \
		echo "后端未运行，未找到 PID 文件"; \
	else \
		PID=$$(cat "$(BACKEND_PID)"); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "正在停止后端，PID：$$PID"; \
			kill -- -$$PID 2>/dev/null || kill $$PID 2>/dev/null || true; \
			for i in 1 2 3 4 5; do \
				if ! kill -0 $$PID 2>/dev/null; then \
					break; \
				fi; \
				sleep 1; \
			done; \
			if kill -0 $$PID 2>/dev/null; then \
				echo "普通停止失败，正在强制停止"; \
				kill -9 -- -$$PID 2>/dev/null || kill -9 $$PID 2>/dev/null || true; \
			fi; \
			echo "后端已停止"; \
		else \
			echo "后端进程已经不存在"; \
		fi; \
		rm -f "$(BACKEND_PID)"; \
	fi


backend-restart: backend-stop backend


backend-status:
	@if [ -f "$(BACKEND_PID)" ] && kill -0 $$(cat "$(BACKEND_PID)") 2>/dev/null; then \
		echo "后端正在运行"; \
		echo "PID：$$(cat "$(BACKEND_PID)")"; \
		echo "地址：http://localhost:8000"; \
	else \
		echo "后端未运行"; \
		rm -f "$(BACKEND_PID)"; \
	fi


backend-logs:
	@touch "$(BACKEND_LOG)"
	@tail -f "$(BACKEND_LOG)"


admin:
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "未找到 npm，请先安装 Node.js 和 npm"; \
		exit 1; \
	fi
	@if [ -f "$(ADMIN_PID)" ] && kill -0 $$(cat "$(ADMIN_PID)") 2>/dev/null; then \
		echo "运营后台已经运行"; \
		echo "PID：$$(cat "$(ADMIN_PID)")"; \
		echo "地址：http://localhost:5173"; \
	else \
		rm -f "$(ADMIN_PID)"; \
		if [ ! -d "$(ADMIN_DIR)/node_modules" ]; then \
			echo "首次运行，正在安装前端依赖..."; \
			cd "$(ADMIN_DIR)" && npm install; \
		fi; \
		echo "正在后台启动运营后台..."; \
		cd "$(ADMIN_DIR)" && \
		nohup setsid npm run dev -- --host 0.0.0.0 \
			> "$(ADMIN_LOG)" 2>&1 & \
		echo $$! > "$(ADMIN_PID)"; \
		sleep 3; \
		if kill -0 $$(cat "$(ADMIN_PID)") 2>/dev/null; then \
			echo "运营后台启动成功"; \
			echo "PID：$$(cat "$(ADMIN_PID)")"; \
			echo "地址：http://localhost:5173"; \
			echo "日志：$(ADMIN_LOG)"; \
		else \
			echo "运营后台启动失败"; \
			echo "请查看日志：$(ADMIN_LOG)"; \
			rm -f "$(ADMIN_PID)"; \
			tail -n 30 "$(ADMIN_LOG)" 2>/dev/null || true; \
			exit 1; \
		fi; \
	fi


admin-stop:
	@if [ ! -f "$(ADMIN_PID)" ]; then \
		echo "运营后台未运行，未找到 PID 文件"; \
	else \
		PID=$$(cat "$(ADMIN_PID)"); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "正在停止运营后台，PID：$$PID"; \
			kill -- -$$PID 2>/dev/null || kill $$PID 2>/dev/null || true; \
			for i in 1 2 3 4 5; do \
				if ! kill -0 $$PID 2>/dev/null; then \
					break; \
				fi; \
				sleep 1; \
			done; \
			if kill -0 $$PID 2>/dev/null; then \
				echo "普通停止失败，正在强制停止"; \
				kill -9 -- -$$PID 2>/dev/null || kill -9 $$PID 2>/dev/null || true; \
			fi; \
			echo "运营后台已停止"; \
		else \
			echo "运营后台进程已经不存在"; \
		fi; \
		rm -f "$(ADMIN_PID)"; \
	fi


admin-restart: admin-stop admin


admin-status:
	@if [ -f "$(ADMIN_PID)" ] && kill -0 $$(cat "$(ADMIN_PID)") 2>/dev/null; then \
		echo "运营后台正在运行"; \
		echo "PID：$$(cat "$(ADMIN_PID)")"; \
		echo "地址：http://localhost:5173"; \
	else \
		echo "运营后台未运行"; \
		rm -f "$(ADMIN_PID)"; \
	fi


admin-logs:
	@touch "$(ADMIN_LOG)"
	@tail -f "$(ADMIN_LOG)"


mp:
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "未找到 npm，请先安装 Node.js 和 npm"; \
		exit 1; \
	fi
	@cd "$(MP_DIR)" && npm install && npm run dev:weapp


test:
	@if [ ! -x "$(VENV_PY)" ]; then \
		echo "未找到虚拟环境，请先执行：make install"; \
		exit 1; \
	fi
	@cd "$(BACKEND_DIR)" && "$(VENV_PY)" -m pytest -q


smoke:
	@bash "$(ROOT_DIR)/docs/smoke.sh"


verify: seed backend
	@echo "正在等待后端服务就绪..."
	@READY=0; \
	for i in $$(seq 1 30); do \
		if curl -fsS "http://localhost:8000/docs" >/dev/null 2>&1; then \
			READY=1; \
			echo "后端服务已就绪"; \
			break; \
		fi; \
		sleep 1; \
	done; \
	if [ $$READY -ne 1 ]; then \
		echo "后端启动超时"; \
		echo "请查看日志：$(BACKEND_LOG)"; \
		exit 1; \
	fi
	@$(MAKE) smoke
	@echo "verify 校验通过"


template:
	@if [ ! -x "$(VENV_PY)" ]; then \
		echo "未找到虚拟环境，请先执行：make install"; \
		exit 1; \
	fi
	@mkdir -p "$(ROOT_DIR)/docs"
	@cd "$(BACKEND_DIR)" && \
		"$(VENV_PY)" scripts/gen_template.py \
		"$(ROOT_DIR)/docs/excel-import-template.xlsx"
	@echo "模板已生成：docs/excel-import-template.xlsx"


clean:
	@if [ -f "$(BACKEND_PID)" ] && kill -0 $$(cat "$(BACKEND_PID)") 2>/dev/null; then \
		echo "请先执行 make backend-stop"; \
		exit 1; \
	fi
	@if [ -f "$(ADMIN_PID)" ] && kill -0 $$(cat "$(ADMIN_PID)") 2>/dev/null; then \
		echo "请先执行 make admin-stop"; \
		exit 1; \
	fi
	@rm -f "$(BACKEND_PID)" "$(ADMIN_PID)"
	@rm -f "$(BACKEND_LOG)" "$(ADMIN_LOG)"
	@find "$(ROOT_DIR)" -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
	@find "$(ROOT_DIR)" -type d -name ".pytest_cache" -prune -exec rm -rf {} + 2>/dev/null || true
	@find "$(ROOT_DIR)" -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -f "$(BACKEND_DIR)/adult_edu.db"
	@rm -f "$(BACKEND_DIR)/adult_edu_test.db"
	@echo "清理完成"

