# Admin Web — 运营管理后台

> Vite + React 18 + TypeScript + Ant Design 5 实现的运营后台单页应用，对接后端 `/api/v1/admin/*`。

## 技术栈

| 层 | 选型 |
|---|---|
| 构建 | Vite 5 |
| 框架 | React 18 + TypeScript 5 |
| UI 库 | Ant Design 5（中文 locale） |
| 路由 | React Router 6 |
| 状态 | Zustand 4（仅 auth 用，持久化到 localStorage） |
| HTTP | Axios（拦截器注入 token / 401 跳转） |
| 时间 | dayjs |

## 目录结构

```
admin-web/
├── index.html
├── vite.config.ts          # /api/v1 代理到后端 :8000
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx            # 入口（ConfigProvider + BrowserRouter）
    ├── App.tsx             # 顶层路由 + RequireAuth
    ├── api/
    │   └── client.ts       # axios 实例 + 拦截器 + idempotentPost / idempotentPut
    ├── store/
    │   └── auth.ts         # useAuthStore（token + admin + hasPerm）
    ├── components/
    │   ├── PermissionGuard.tsx   # PermissionGuard / PermButton
    │   └── layout/
    │       └── AdminLayout.tsx  # 侧边栏菜单 + 顶栏 + Outlet
    └── pages/
        ├── login/index.tsx
        ├── dashboard/index.tsx
        ├── catalog/
        │   ├── exam-categories.tsx
        │   ├── exams.tsx
        │   ├── subjects.tsx
        │   ├── chapters.tsx
        │   └── knowledge-points.tsx
        ├── question/
        │   ├── list.tsx
        │   └── edit.tsx
        ├── paper/
        │   ├── list.tsx
        │   └── edit.tsx
        ├── review.tsx
        ├── import.tsx
        ├── pdf-tool.tsx
        ├── daily.tsx
        ├── user/list.tsx
        ├── feedback/
        │   ├── list.tsx
        │   └── detail.tsx
        ├── admin/
        │   ├── users.tsx
        │   └── roles.tsx
        ├── audit.tsx
        └── ops/
            ├── banners.tsx
            └── announcements.tsx
```

## 路由表

| 路径 | 页面 | 说明 |
|---|---|---|
| `/login` | LoginPage | 后台账号密码登录 |
| `/` | → `/dashboard` | 默认跳转 |
| `/dashboard` | DashboardPage | 工作台（今日/7 日指标汇总） |
| `/catalog/categories` | ExamCategoriesPage | 考试大类 CRUD |
| `/catalog/exams` | ExamsPage | 考试方向 CRUD |
| `/catalog/subjects` | SubjectsPage | 科目 CRUD |
| `/catalog/chapters` | ChaptersPage | 章节 CRUD |
| `/catalog/knowledge-points` | KnowledgePointsPage | 知识点 CRUD |
| `/questions` | QuestionListPage | 题目列表（筛选 / 批量操作） |
| `/questions/new` | QuestionEditPage | 新建题目（草稿） |
| `/questions/:id/edit` | QuestionEditPage | 编辑题目（已有版本时新建版本） |
| `/import` | ImportPage | Excel 上传 / 解析预览 / 导入任务列表 / 确认落库 |
| `/pdf-tool` | PdfToolPage | PDF → Excel 转换（pdfplumber） |
| `/review` | ReviewPage | 待审核列表 / 单题审核 / 批量通过 |
| `/papers` | PaperListPage | 试卷列表 |
| `/papers/new` | PaperEditPage | 新建试卷 |
| `/papers/:id/edit` | PaperEditPage | 编辑试卷 / 发布 |
| `/daily` | DailyPage | 每日一练配置 |
| `/users` | UserListPage | C 端用户列表 / 封禁 / 解封 |
| `/feedback` | FeedbackListPage | 反馈工单列表 |
| `/feedback/:id` | FeedbackDetailPage | 工单详情 / 回复 / 解决 |
| `/admin/users` | AdminUsersPage | 后台管理员 CRUD |
| `/admin/roles` | RolesPage | 角色 / 权限矩阵管理 |
| `/audit` | AuditPage | 审计日志查询（需 `audit.query`） |
| `/ops/banners` | BannersPage | 首页 Banner 维护 |
| `/ops/announcements` | AnnouncementsPage | 公告维护 |

## 状态管理

仅 `auth` 一个 Zustand store（持久化到 `localStorage` 的 `admin-auth` key）：

```ts
interface AuthState {
  token: string | null;
  admin: AdminInfo | null;   // 含 is_super_admin + permissions: string[]
  setAuth(token, admin): void;
  logout(): void;
  hasPerm(code: string): boolean;  // 超管直接 true
}
```

- `hasPerm` 在客户端做权限码判断；真正写操作以后端 RBAC 为准。
- `<PermissionGuard code="xxx">` 与 `<PermButton code="xxx">` 用于条件渲染按钮 / 区域。

## HTTP 客户端

`src/api/client.ts`：

- `baseURL: '/api/v1'`，由 `vite.config.ts` 代理到后端 `:8000`。
- 请求拦截器自动注入 `Authorization: Bearer <token>`。
- 响应拦截器：
  - `401` → 弹出提示、清空 store、跳 `/login`。
  - 其余错误 → `message.error(\`${code}: ${message}\`)`。
- 工具函数 `idempotentPost` / `idempotentPut` 自动添加 `Idempotency-Key` 头（用于题目版本保存、导入确认等幂等写接口）。

## 运行

仓库根目录通过 Makefile 一键操作：

```bash
make install       # 装后端依赖（不会自动装前端）
make admin         # 后台启动 npm run dev -- --host 0.0.0.0，监听 :5173
make admin-stop
make admin-restart
make admin-status
make admin-logs
```

直接调用：

```bash
cd admin-web
npm install         # 首次安装依赖
npm run dev         # 启动开发服务器（默认 :5173，已配置 /api/v1 代理）
npm run build       # tsc --noEmit + vite build（产物 dist/）
npm run preview     # 预览生产构建
```

## 与后端的约定

- **登录**：`POST /api/v1/admin/auth/login`，返回 `{ token, admin: { id, username, display_name, is_super_admin, permissions } }`。
- **当前用户**：`GET /api/v1/admin/auth/me`（可刷新权限）。
- **菜单可见性**：完全由后端权限码驱动；前端只做软隐藏。
- **审计**：`audit-logs` 写入由后端完成，前端无需关心。

## 默认账号

> 种子数据中创建的超管：`admin / Admin@123`（仅本地开发用）。

## 常见问题

- **登录后立刻 401**：`localStorage` 中的 `admin-auth` 已过期，清掉重新登录；或后端 `jwt_secret` 变更导致旧 token 失效。
- **接口跨域**：开发期通过 Vite 代理避免 CORS；上线需把 `admin-web` 与 `backend` 部署在同一域或反向代理同一前缀。
- **按钮看不到**：`hasPerm` 返回 `false`，检查当前账号 `permissions` 是否包含对应权限码（参考 [`docs/rbac.md`](../docs/rbac.md)）。
- **`Idempotency-Key`**：发布 / 提交审核 / 导入确认 等写接口必须带，前端 `idempotentPost/Put` 会自动注入。