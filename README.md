# 成人教育刷题小程序 MVP

> 按 [《成人教育刷题小程序：C 端与运营后台 Agent 开发需求文档 V1.1》](./成人教育刷题小程序_C端与运营后台_Agent开发需求文档_V1.1.md) 实现的选择题 MVP，包含 C 端小程序、运营后台 Web 与 FastAPI 后端三大模块。

## 模块组成

| 模块 | 路径 | 技术栈 | 默认端口 | 说明 |
|---|---|---|---|---|
| Backend | [`backend/`](./backend/README.md) | FastAPI 0.115 + SQLAlchemy 2 + Alembic + Pydantic 2 + SQLite | `:8000` | REST API、JWT、RBAC、幂等键、审计日志、Excel/PDF 导入 |
| Admin Web | [`admin-web/`](./admin-web/README.md) | Vite 5 + React 18 + TypeScript 5 + Ant Design 5 | `:5173` | 运营管理后台（题库 / 目录 / 审核 / 试卷 / 报表 / 权限等） |
| Miniprogram | [`miniprogram/`](./miniprogram/README.md) | Taro 3.6 + React 18 + TypeScript + Taroify | 微信开发者工具 | C 端小程序（一码多端：weapp / h5 / 其它） |

## 一键启动

```bash
# 1. 安装后端依赖（首次）
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
# 或者：make install

# 2. 初始化数据库 + 灌种子（角色 / 权限 / 超管 / CET-4 目录）
make seed

# 3. 后台启动后端（端口 8000，PID 写入 .backend.pid）
make backend

# 4. 后台启动运营后台（端口 5173，PID 写入 .admin.pid）
make admin

# 5. 启动小程序 watch 编译（产物输出到 miniprogram/dist/，用微信开发者工具导入）
make mp

# 6. 跑测试 / smoke / 一键 verify
make test
make smoke
make verify
```

## 关键端口

| 服务 | 地址 | 说明 |
|---|---|---|
| FastAPI | http://127.0.0.1:8000 | REST API |
| Swagger | http://127.0.0.1:8000/docs | OpenAPI 交互文档 |
| 运营后台 | http://127.0.0.1:5173 | Vite dev server，已代理 `/api/v1`、`/static` 到 8000 |
| 小程序 | 微信开发者工具 | 编译产物 `miniprogram/dist`，需要在 IDE 中点「编译」 |

## Makefile 命令一览

| 命令 | 说明 |
|---|---|
| `make install` | 创建 `.venv` 并安装后端依赖 |
| `make seed` | alembic upgrade head + 灌种子（角色 / 权限 / 超管 / 考试目录） |
| `make backend` / `backend-stop` / `backend-restart` / `backend-status` / `backend-logs` | 后端的启动 / 停止 / 重启 / 状态 / 日志 |
| `make admin` / `admin-stop` / `admin-restart` / `admin-status` / `admin-logs` | 运营后台的启动 / 停止 / 重启 / 状态 / 日志 |
| `make mp` | `npm install` + `npm run dev:weapp`（小程序 watch 编译） |
| `make test` | 后端 pytest |
| `make smoke` | 端到端 smoke 测试（`docs/smoke.sh`） |
| `make verify` | seed + 后端 + smoke 一键全链路校验 |
| `make template` | 生成 `docs/excel-import-template.xlsx` |
| `make clean` | 清理缓存 / 日志 / 数据库（**不会**清 `.venv` 与 `uploads/`） |

## 目录结构

```
.
├── backend/              # FastAPI 后端
│   ├── app/              # 业务代码（api / core / models / schemas / services / seed）
│   ├── alembic/          # 数据库迁移
│   ├── scripts/          # 初始化 / 模板生成 / PDF 转换等运维脚本
│   ├── uploads/          # 上传资源（images / audios）
│   ├── requirements.txt
│   └── README.md
├── admin-web/            # 运营管理后台（React + AntD）
│   ├── src/
│   │   ├── api/          # axios 客户端 + 拦截器 + 幂等封装
│   │   ├── components/   # PermissionGuard / 布局
│   │   ├── pages/        # 业务页面（按域划分）
│   │   └── store/        # auth (Zustand)
│   └── README.md
├── miniprogram/          # 微信小程序 C 端
│   ├── src/
│   │   ├── api/          # Taro.request 封装的轻量 HTTP 客户端
│   │   ├── components/   # 通用展示组件
│   │   ├── pages/        # 21 个页面（启动 / Tab Bar / 练习 / 学习互动）
│   │   ├── store/        # auth (内存 + storage 缓存)
│   │   └── app.config.ts # pages / window / tabBar
│   └── README.md
├── docs/                 # 架构、运行手册、API、ER 图、RBAC、Excel 规范等
│   ├── architecture.md
│   ├── runbook.md
│   ├── api.md
│   ├── database.md
│   ├── rbac.md
│   ├── excel-import.md
│   ├── acceptance-checklist.md
│   ├── known-limitations.md
│   └── smoke.sh          # 端到端 smoke 脚本
├── Makefile              # 全模块启停入口
├── README.md             # ← 当前文件
└── .gitignore
```

## 默认账号

> 种子数据创建的超管（仅本地开发用）：

| 端 | 账号 | 密码 |
|---|---|---|
| 后台 | `admin` | `Admin@123` |
| C 端 | 微信扫码 | —（生产需配置 `WECHAT_APPID` / `WECHAT_SECRET`） |

修改默认密码：在 `backend/.env` 设置 `ADMIN_DEFAULT_PASSWORD` 并重新 `make seed`；或登录后台后在「管理员」中修改。

## 文档

| 主题 | 路径 |
|---|---|
| 架构说明 | [`docs/architecture.md`](./docs/architecture.md) |
| 运行手册 | [`docs/runbook.md`](./docs/runbook.md) |
| API 文档 | [`docs/api.md`](./docs/api.md)（启动后端后访问 `http://localhost:8000/docs`） |
| 数据库 ER 图 | [`docs/database.md`](./docs/database.md) |
| RBAC 权限矩阵 | [`docs/rbac.md`](./docs/rbac.md) |
| Excel 导入规范 | [`docs/excel-import.md`](./docs/excel-import.md) |
| MVP 验收对照清单 | [`docs/acceptance-checklist.md`](./docs/acceptance-checklist.md) |
| 已知限制 | [`docs/known-limitations.md`](./docs/known-limitations.md) |
| 后端模块 | [`backend/README.md`](./backend/README.md) |
| 运营后台模块 | [`admin-web/README.md`](./admin-web/README.md) |
| 小程序模块 | [`miniprogram/README.md`](./miniprogram/README.md) |