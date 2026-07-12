# 成人教育刷题小程序 MVP

按 [《成人教育刷题小程序：C 端与运营后台 Agent 开发需求文档 V1.1》](./成人教育刷题小程序_C端与运营后台_Agent开发需求文档_V1.1.md) 实现的选择题 MVP。

## 技术栈

- **后端**：FastAPI + SQLAlchemy + Alembic + Pydantic + SQLite（单进程，零外部依赖）
- **运营后台**：Vite + React 18 + TypeScript + Ant Design
- **C 端小程序**：Taro 3 + React + TypeScript

## 一键启动

```bash
# 1. 安装后端依赖
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# 2. 初始化数据库 + 灌种子
make seed

# 3. 启动后端（:8000）
make backend

# 4. 启动后台（:5173）
make admin

# 5. 跑测试
make test
```

## 目录结构

```
backend/      # FastAPI 后端
admin-web/    # 运营管理后台
miniprogram/  # 微信小程序 C 端
docs/         # 文档
```

## 默认账号

- 超级管理员：`admin / Admin@123`

## 文档

- [架构说明](./docs/architecture.md)
- [运行手册](./docs/runbook.md)
- [API 文档](./docs/api.md)（启动后端后访问 `http://localhost:8000/docs`）
- [数据库 ER 图](./docs/database.md)
- [RBAC 权限矩阵](./docs/rbac.md)
- [Excel 导入规范](./docs/excel-import.md)
- [20 项 MVP 验收对照清单](./docs/acceptance-checklist.md)
- [已知限制](./docs/known-limitations.md)