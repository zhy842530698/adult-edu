# 运行手册

## 一键启动

```bash
# 0. 进入项目根
cd adult_edu

# 1. 创建虚拟环境并安装依赖（首次）
make install

# 2. 初始化数据库 + 灌种子
make seed

# 3. 启动后端（终端 A，端口 8000）
make backend

# 4. 启动管理后台（终端 B，端口 5173）
make admin

# 5. （可选）启动小程序：微信开发者工具导入 miniprogram/dist
make mp
```

## 关键端口

| 服务 | 地址 | 说明 |
|---|---|---|
| FastAPI | http://127.0.0.1:8000 | REST API |
| Swagger | http://127.0.0.1:8000/docs | OpenAPI 交互文档 |
| 运营后台 | http://127.0.0.1:5173 | Vite dev server，已代理 `/api` `/static` 到 8000 |
| 小程序 | 微信开发者工具 | 编译产物 `miniprogram/dist` |

## 默认账号

| 端 | 账号 | 密码 |
|---|---|---|
| 后台 | `admin` | `Admin@123` |

普通账号可在登录后于「权限 → 管理员」新增；修改默认密码请直接编辑 `backend/.env` 中的 `ADMIN_DEFAULT_PASSWORD` 或重新创建管理员。

## 环境变量（backend/.env）

```ini
DATABASE_URL=sqlite:///./adult_edu.db
JWT_SECRET=dev-only-please-change-in-prod
JWT_ALG=HS256
JWT_EXPIRE_MIN=7200
ADMIN_DEFAULT_PASSWORD=Admin@123
UPLOAD_DIR=./uploads
STATIC_URL_PREFIX=/static
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
REVIEW_SELF_APPROVE_ALLOWED=false
WECHAT_APPID=微信小程序AppID
WECHAT_SECRET=微信小程序AppSecret
```

> 生产环境务必修改 `JWT_SECRET`、`ADMIN_DEFAULT_PASSWORD` 并把 `DATABASE_URL` 切换到 PostgreSQL。

## 常用运维动作

```bash
# 重新跑迁移 + 灌种子（清空再灌）
rm backend/adult_edu.db && make seed

# 重新生成 Excel 导入模板
make template    # 产物：docs/excel-import-template.xlsx

# 跑后端测试
make test

# 跑端到端 smoke
make smoke

# 全链路 verify
make verify

# 清缓存 / DB
make clean
```

## C 端登录（MVP）

小程序调用 `wx.login` 获取一次性 code，再请求 `/api/v1/auth/wechat/login`；后端使用
`WECHAT_APPID`、`WECHAT_SECRET` 调用微信 `jscode2session` 换取 openid。AppID 必须与
`miniprogram/project.config.json` 中的 `appid` 一致。未配置微信凭据时登录会明确返回 401，
不会再把 code 或 mock 字符串当作 openid。

真机调试时，API 地址不能使用 `127.0.0.1`；设置 `TARO_APP_API_BASE` 为手机可访问的
HTTPS 后端地址，并在微信公众平台配置 request 合法域名。

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 后台登录提示 401 | `JWT_SECRET` 改了之后旧 token 失效；清理浏览器 `localStorage.admin-auth` 后重新登录。 |
| 导入任务一直 PENDING | 同步执行不会出现 PENDING；如出现请检查服务是否 OOM。 |
| `make test` 报 `no such table` | 当前测试已移除（用 `make smoke` 替代）。 |
| 管理后台列表 403 | 当前账号缺少 `xxx.query` 权限；切换超管或在「角色」中勾上。 |
| 小程序看不到题 | 后台未配置目录或目录停用；进入 `考试目录` 检查 `is_active`。 |
