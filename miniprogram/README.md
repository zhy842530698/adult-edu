# Miniprogram — 微信小程序 C 端

> 基于 Taro 3 + React 18 + TypeScript 的微信小程序，一份代码可同时构建 H5 / 微信 / 其它端。

## 技术栈

| 层 | 选型 |
|---|---|
| 跨端框架 | Taro 3.6.7（react / weapp / h5 / swan / alipay / tt / rn） |
| UI | `@taroify/core` 0.9 + `@taroify/icons` |
| React | 18.2 |
| 构建 | Webpack 5（Taro 内置 webpack5-runner） |
| 语言 | TypeScript 5 |
| HTTP | `Taro.request` 封装的轻量客户端（带 token / 401 处理） |

## 目录结构

```
miniprogram/
├── babel.config.js
├── tsconfig.json
├── project.config.json         # 微信开发者工具项目配置（appid、miniprogramRoot）
├── project.private.config.json
├── config/                     # Taro 构建配置（按端区分）
├── dist/                       # 构建产物（weapp → dist；h5 → dist-h5）
└── src/
    ├── app.tsx                 # 应用入口：登录后做 onboarding 守卫
    ├── app.config.ts           # pages / window / tabBar
    ├── app.css                 # 全局样式 + CSS 变量（品牌色板）
    ├── index.html              # H5 入口模板
    ├── api/
    │   └── client.ts           # api.get/post/put/delete + token 注入 + 401 跳转
    ├── store/
    │   └── auth.ts             # 用户 / 考试目标缓存 + loginWithWechat / logout
    ├── utils/
    │   └── format.ts           # 时间 / 数字 / 错误提示格式化
    ├── components/             # 通用展示组件
    │   ├── Card.tsx
    │   ├── Difficulty.tsx
    │   ├── Icon.tsx
    │   ├── Illustration.tsx
    │   ├── ProgressBar.tsx
    │   └── Tag.tsx
    └── pages/                  # 21 个页面（详见下表）
```

## 页面与路由

> 完整路由由 `src/app.config.ts` 的 `pages` 数组决定，以下为页面清单（按业务域分组）。

### 启动流程

| 路由 | 页面 | 关键能力 |
|---|---|---|
| `pages/login/index` | LoginPage | `Taro.login` 拿 code → `POST /auth/wechat/login` 换 token，写入 `user-token` / `user-info` storage |
| `pages/onboarding/index` | OnboardingPage | 完成「隐私协议 → 选考试 → 每日目标」三步引导；`app.tsx` 在 token 存在但 `onboarding-status.completed=false` 时强制跳转过来 |

### Tab Bar（底部 4 个一级入口）

| 路由 | 页面 | 关键能力 |
|---|---|---|
| `pages/home/index` | HomePage | 顶部 Greeting + 每日任务卡片 + 三大主入口（顺序 / 随机 / 模拟）+ 错题 / 收藏快捷入口 + 进度环 |
| `pages/catalog/index` | CatalogPage | 多级目录导航：考试大类 → 考试 → 科目 → 章节 → 知识点；展示顺序练习通关情况 |
| `pages/practice/index` | PracticeHubPage | 练习模式选择（顺序 / 随机 / 章节 / 知识点 / 模拟）+ 进入配置页 |
| `pages/profile/index` | ProfilePage | 用户信息、每日目标、错题数 / 收藏数入口、设置、退出登录 |

### 练习 / 进度 / 错题 / 收藏（Tab Bar 之外）

| 路由 | 页面 | 关键能力 |
|---|---|---|
| `pages/practice/config` | PracticeConfigPage | 选择范围（章节 / 知识点 / 题量）创建会话 |
| `pages/practice/session` | SessionPage | 答题主界面：上一题 / 下一题 / 收藏 / 标记 / 提交（`Idempotency-Key`） |
| `pages/practice/result` | ResultPage | 交卷结果：总分、正确率、逐题对错、解析（`MOCK` 模式交卷后才显示答案） |
| `pages/wrong/index` | WrongListPage | 错题列表 |
| `pages/wrong/analysis` | WrongAnalysisPage | 错题按章节 / 知识点聚合分析 |
| `pages/favorite/index` | FavoriteListPage | 收藏题列表 |
| `pages/progress/index` | ProgressPage | 累计统计 + 各考试进度 |
| `pages/study/plan` | StudyPlanPage | 学习计划（来自 `/study-plan`） |
| `pages/study/daily` | DailyPage | 每日任务详情 |
| `pages/study/checkin` | CheckinPage | 每日打卡 |
| `pages/learn/report` | ReportPage | 学习报告（`/progress/weekly` 周报） |
| `pages/learn/notes` | NotesPage | 题目笔记（`/notes`） |
| `pages/mock/list` | MockListPage | 模拟试卷列表（接入 `papers`） |
| `pages/feedback/index` | FeedbackPage | 题目纠错工单提交 |

## 状态管理

- **`api/client.ts`**：`api.get/post/put/delete`，自动注入 `Authorization` 与 `Idempotency-Key`，`401` 时清空登录态并 `reLaunch` 到登录页。
- **`store/auth.ts`**：本地缓存用户信息与考试目标，提供 `loginWithWechat` / `logout` / `loadTargets` / `setPrimaryExam` / `setDailyTarget`。
- **`app.tsx`**：登录后 `GET /user/onboarding-status`，未完成则 `reLaunch` 到 onboarding。

## API 对接

所有请求统一指向 `process.env.TARO_APP_API_BASE || 'http://192.168.1.2:8000/api/v1'`：

| 业务 | 主要端点 |
|---|---|
| 登录 | `POST /auth/wechat/login`、`GET /auth/me` |
| Onboarding | `GET /user/onboarding-status`、`POST /user/onboarding` |
| 目标 | `GET/POST /user/exam-targets`、`PUT /user/daily-target`、`POST /user/agreement`、`POST /user/logout` |
| 目录 | `GET /exam-catalog`、`GET /exams/{id}/progress` |
| 练习 | `POST /practice-sessions`、`GET /{id}`、`PUT /{id}/answers/{qv_id}`（幂等）、`POST /{id}/submit`、`GET /{id}/result`、`GET /practice-sessions/daily-task` |
| 错题 | `GET /wrong-questions`、`POST /wrong-questions/practice`、`POST /wrong-questions/{id}/remove` |
| 收藏 | `GET /favorites`、`PUT/DELETE /questions/{id}/favorite` |
| 进度 / 互动 | `GET /progress/summary`、`GET /study-plan`、`GET/POST /notes`、`GET/POST /check-ins`、`GET /progress/weekly` |
| 反馈 | `POST /question-feedback` |

完整接口定义参见 [`backend/README.md`](../backend/README.md) 与 `http://192.168.1.2:8000/docs`。

## 运行与构建

仓库根目录通过 Makefile：

```bash
make mp           # 首次运行会自动 npm install，然后 npm run dev:weapp（开启 watch）
```

直接调用：

```bash
cd miniprogram
npm install
npm run dev:weapp     # 微信小程序 watch 构建，产物输出到 dist/
npm run build:weapp   # 单次构建
npm run dev:h5        # H5 调试
npm run build:h5      # H5 产物输出到 ../dist-h5
```

微信开发者工具导入项目时选择 `miniprogram/` 目录，`miniprogramRoot` 默认为 `dist/`（在 `project.config.json` 中）。

> ⚠️ 微信开发者工具需要在「设置 → 安全 → 服务端口」开启 CLI / HTTP 调试，否则 IDE 自带的预览可能拿到的是 `dist/` 内旧文件。每次 `dev:weapp` 重新编译后，在 IDE 中点「编译」即可。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `TARO_APP_API_BASE` | `http://192.168.1.2:8000/api/v1` | 后端 API 前缀。本机 IP 不同时用 `bash scripts/local_ip.sh` 探测后覆盖；生产改 HTTPS 域名 |

> 微信小程序要求线上域名走 HTTPS 并加入「开发者后台」request 合法域名列表；本地开发期可在「详情 → 本地设置」勾选「不校验合法域名」。

## 常见问题

- **白屏 / 报错**：删除 `dist/`、`node_modules/.cache`，重新 `npm install && npm run dev:weapp`。
- **登录后立刻掉线**：检查 `TARO_APP_API_BASE` 是否能访问，`backend` 是否已 `make seed`。
- **接口 401**：token 过期，拦截器会自动 reLaunch 到 login 页；如反复出现，确认后端 `jwt_secret` 未变更。
- **onboarding 死循环**：未调 `POST /user/onboarding` 完成三步提交。
- **模拟考试不显示答案**：必须先调 `POST /practice-sessions/{id}/submit`，未交卷时后端 `reveal_answers=False`。