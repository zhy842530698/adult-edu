# 页面与按钮清单（Page & Button Inventory）

> **测试基准**
> - Git commit: `e28d22547d0c52300c1d6935f3e11becbbc4477e`（fix miniprogram）
> - 后端: FastAPI @ `http://192.168.1.2:8000/api/v1`
> - 小程序: Taro 3 + React + TS @ `miniprogram/`
> - 生成时间: 2026-07-16
> - 统计: 19 个页面，111 个交互元素（按钮 / 卡片 / 列表项 / Tab / 表单控件 / 弹窗确认 / TabBar 等）

> 命名规则：`{页面前缀}-BTN-{序号}`
> - 状态字段：`UNTESTED`（未测试）、`PASS`（通过）、`FAIL`（失败）、`BLOCKED`（阻塞）

---

## 1. 全局 TabBar（4 项）

| 元素编号 | 元素名称 | 类型 | 出现条件 | 点击行为 | 目标路由 | 测试状态 |
|---|---|---|---|---|---|---|
| TAB-HOME | 首页 | TabBar | 任意 | switchTab | /pages/home/index | PASS（已注册为 TabBar） |
| TAB-CATALOG | 题库 | TabBar | 任意 | switchTab | /pages/catalog/index | PASS |
| TAB-PRACTICE | 练习 | TabBar | 任意 | switchTab | /pages/practice/index | PASS |
| TAB-PROFILE | 我的 | TabBar | 任意 | switchTab | /pages/profile/index | PASS |

---

## 2. 登录页 `pages/login/index`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| LOGIN-CHECK-001 | 同意条款复选框 | 复选框 | 默认未勾选 | 点击切换 | 出现/消失勾选样式 | — | PASS |
| LOGIN-LNK-001 | 《用户协议》文字链 | 文本链 | 始终 | 点击 | 无响应（未实现弹窗） | — | FAIL — 无实际跳转 |
| LOGIN-LNK-002 | 《隐私政策》文字链 | 文本链 | 始终 | 点击 | 无响应（未实现弹窗） | — | FAIL — 无实际跳转 |
| LOGIN-BTN-001 | 微信一键登录 | 主按钮 | 始终 | 点击 | 调 `wx.login` → 后端登录 → onboarding / 首页 | POST /api/v1/auth/wechat/login | BLOCKED — 真实 `wx.login` 必须在微信开发者工具中测试；后端无 jscode2session Mock 在测试码下必失败 |

---

## 3. 新用户引导页 `pages/onboarding/index`（5 步向导）

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| ONB-OPT-001 | 备战考试 选项 | 选项卡 | step=1 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-002 | 提升技能 选项 | 选项卡 | step=1 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-003 | 保持手感 选项 | 选项卡 | step=1 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-101 | 考试列表行 | 选项卡 | step=2, 列表非空 | 点击 | 高亮 + 选中 | GET /api/v1/exam-catalog | PASS — API OK |
| ONB-OPT-201 | 很快提升 选项 | 选项卡 | step=3 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-202 | 稳步提升 选项 | 选项卡 | step=3 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-203 | 保持手感 选项 | 选项卡 | step=3 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-301 | 10 分钟/天 | 选项卡 | step=4 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-302 | 20 分钟/天 | 选项卡 | step=4 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-303 | 30 分钟/天 | 选项卡 | step=4 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-OPT-304 | 45 分钟/天 | 选项卡 | step=4 | 点击 | 高亮 + 选中 | — | PASS |
| ONB-BTN-001 | 上一步 | 次按钮 | step > 1 | 点击 | step - 1 | — | PASS |
| ONB-BTN-002 | 下一步 | 主按钮 | step < 5, canNext | 点击 | step + 1，未选时禁用 | — | PASS |
| ONB-BTN-003 | 开始刷题（提交） | 主按钮 | step=5 | 点击 | POST /user/onboarding → Toast「目标设置成功」→ switchTab home | POST /api/v1/user/onboarding | PASS |
| ONB-LNK-001 | 重新选择 | 文本链 | step=5 | 点击 | 回到 step=1，清 plan | — | PASS |
| ONB-PROGRESS | 步骤进度条 | 进度条 | 始终 | — | 1/5 ~ 5/5 显示 | — | PASS |

---

## 4. 首页 `pages/home/index`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| HOME-SEARCH | 顶部搜索条 | 卡片 | 已登录 | 点击 | navigateTo 题库 | — | PASS |
| HOME-CHECKIN | 每日打卡渐变卡（整卡） | 卡片 | 已登录 | 点击 | 仅展示，不跳转（注：当前实现未绑定跳转） | — | FAIL — 整卡未绑定 onClick |
| HOME-QUICK-001 | 顺序练习宫格 | 宫格 | 已登录 | 点击 | 创建会话 → 跳转 session | POST /api/v1/practice-sessions | PASS |
| HOME-QUICK-002 | 模拟考试宫格 | 宫格 | 已登录 | 点击 | 创建会话 → 跳转 session | POST /api/v1/practice-sessions | PASS |
| HOME-QUICK-003 | 错题本宫格 | 宫格 | 已登录 | 点击 | navigateTo wrong | — | PASS |
| HOME-QUICK-004 | 收藏夹宫格 | 宫格 | 已登录 | 点击 | navigateTo favorite | — | PASS |
| HOME-STATS | 学习数据卡 | 卡片 | 已登录 | 展示 | 显示总数 / 正确率 / 7天 / 学习时长 | GET /progress/summary | PASS |
| HOME-CONTINUE | 继续练习卡 | 卡片 | 有 primary | 点击 | 顺序练习会话 → session | POST /practice-sessions | PASS |
| HOME-PROGRESS | 题库进度条 | 进度条 | 有 primary | 展示 | 显示已刷/总数、百分比 | GET /progress/summary | PASS |
| HOME-DAILY-BTN | 「开始每日一练」 | 按钮 | has_task=true | 点击 | 创建 DAILY 会话 | POST /practice-sessions | PASS |
| HOME-SET-TARGET | 「设置目标考试」 | 主按钮 | 无 primary | 点击 | navigateTo onboarding | — | PASS |
| HOME-STATS-LNK | 「查看全部 ›」 | 文本链 | 已登录 | 点击 | 未实现跳转（无 navigateTo） | — | FAIL — 视觉是链接但未绑定 onClick |

---

## 5. 题库 Tab `pages/catalog/index`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| CAT-SEARCH-INPUT | 搜索框 | Input | 始终 | 输入 | 客户端过滤 | — | PASS |
| CAT-SEARCH-CLEAR | 清空搜索 | 图标 | keyword 非空 | 点击 | 清空 keyword | — | PASS |
| CAT-FILTER-CHIP | 筛选 chip（全部 + 分类） | Tab | 始终 | 点击 | 高亮 + 切换过滤 | — | PASS |
| CAT-EXAM-CARD | 考试行（可展开） | 卡片 | 始终 | 点击 | 切换展开/收起 | — | PASS |
| CAT-EXAM-SEQ | 考试-顺序练习按钮 | 按钮 | 始终 | 点击 | 创建会话 → session | POST /practice-sessions | PASS |
| CAT-EXAM-RAND | 考试-随机练习按钮 | 按钮 | 始终 | 点击 | 创建会话 → session | POST /practice-sessions | PASS |
| CAT-SUBJ-PRAC | 学科练习按钮 | 按钮 | 学科存在 | 点击 | 创建 RANDOM 会话（带 subject_id） | POST /practice-sessions | PASS |
| CAT-CHAP-ROW | 章节行（可展开） | 行 | 章节存在 | 点击 | 切换展开，显示 KP | — | PASS |
| CAT-CHAP-PRAC | 章节练习按钮 | 按钮 | 章节存在 | 点击 | 创建 CHAPTER 会话 | POST /practice-sessions | PASS |
| CAT-KP-PRAC | 练知识点按钮 | 按钮 | KP 存在 | 点击 | 创建 KNOWLEDGE 会话 | POST /practice-sessions | PASS |

---

## 6. 练习 Tab `pages/practice/index`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| PRC-IDX-DAILY | 每日一练入口 | 行 | 始终 | 点击 | navigateTo study/daily | GET /practice-sessions/daily-task | PASS |
| PRC-IDX-WRONG | 错题本入口 | 行 | 始终 | 点击 | navigateTo wrong | — | PASS |
| PRC-IDX-NOTES | 我的笔记入口 | 行 | 始终 | 点击 | navigateTo learn/notes | GET /notes (404) | FAIL — 接口 404，页面将持续 loading |
| PRC-IDX-CHECKIN | 打卡日历入口 | 行 | 始终 | 点击 | navigateTo study/checkin | GET /check-ins (404) | FAIL — 接口 404，页面将持续 loading |
| PRC-IDX-CONFIG | 练习配置入口 | 行 | 始终 | 点击 | navigateTo practice/config（页面存在但未在 app.config 注册） | — | FAIL — 入口点击会失败（reLaunch/navigateTo 找不到页面） |
| PRC-IDX-TODO | 今日任务列表项 | 列表项 | has_task | 展示 | 显示题数 / 完成状态 | GET /practice-sessions/daily-task | PASS |

---

## 7. 练习配置页 `pages/practice/config`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| PCFG-MODE-001 | 顺序练习 模式选项 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED（页面未注册，需先修复路由） |
| PCFG-MODE-002 | 随机练习 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-MODE-003 | 章节练习 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-MODE-004 | 知识点专项 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-MODE-005 | 错题练习 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-MODE-006 | 收藏练习 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-MODE-007 | 模拟考试 | 选项 | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-COUNT-005/010/020/030/050 | 5/10/20/30/50 题 | chip | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-IMMEDIATE | 即时显示 / 交卷后显示 | Tab | 始终 | 点击 | 高亮 + 选中 | — | UNTESTED |
| PCFG-START | 开始练习 | 主按钮 | 始终 | 点击 | setStorage 后 navigateBack | — | UNTESTED |

---

## 8. 答题会话页 `pages/practice/session`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| SESS-OPT-A/B/C/D | 选项 A/B/C/D | 选项卡 | 单选 / 多选 | 点击 | 高亮 + 500ms 防抖保存 | PUT /practice-sessions/{id}/answers/{qvid} | PASS |
| SESS-PREV | 上一题 | 次按钮 | idx > 0 | 点击 | flush save → idx-1 | PUT .../answers/... | PASS |
| SESS-NEXT | 下一题 | 主按钮 | idx < total-1 | 点击 | flush save → idx+1 | PUT .../answers/... | PASS |
| SESS-CARD | ≡ 答题卡 | 按钮 | 始终 | 点击 | 切换答题卡浮层 | — | PASS |
| SESS-CARD-NUM | 答题卡单元格 | 数字 | showCard | 点击 | setIdx | — | PASS |
| SESS-SUBMIT | 交卷 | 主按钮 | idx == total-1 且未交卷 | 点击 | flush → POST submit → result | POST /practice-sessions/{id}/submit | PASS |
| SESS-FAV | 收藏 / 取消收藏 | 图标 | 始终 | 点击 | PUT/DELETE favorite | PUT/DELETE /questions/{qid}/favorite | PASS |
| SESS-FEEDBACK | 题目有误？点这里反馈 | 文本链 | 始终 | 点击 | navigateTo feedback | POST /question-feedback | PASS |
| SESS-BACK-HOME | 返回主页（交卷后） | 主按钮 | 已交卷且最后一题 | 点击 | switchTab home | — | PASS |
| SESS-ANALYSIS-LNK | ⊕ 解析入口 | 图标 | 始终 | 点击 | navigateTo wrong/analysis | — | PASS |

---

## 9. 答题结果页 `pages/practice/result`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| RES-VIEW-ANS | 查看解析 | 主按钮 | 已交卷 | 点击 | navigateTo session（已交卷状态下显示解析） | — | PASS |
| RES-WRONG | 错题本 | 次按钮 | 已交卷 | 点击 | navigateTo wrong | — | PASS |
| RES-RETRY | 再考一次 | 次按钮 | 已交卷 | 点击 | 创建 MOCK 会话 → session | POST /practice-sessions | PASS |
| RES-CARD-CELL | 答题卡单元 | 数字 | 已交卷 | 展示 | 显示颜色（绿/红/灰） | — | PASS |

---

## 10. 错题本 `pages/wrong/index`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| WRG-EDIT | 编辑 / 完成 切换 | 文本 | 始终 | 点击 | 切换 edit 状态（注：edit 状态下的删除按钮未实现，仅切换显示文字） | — | FAIL — 编辑态无实际删除操作 |
| WRG-CHIP | 筛选 chip | chip | 始终 | 点击 | 切换 filter（注：filter 仅切 UI，实际未对 items 过滤） | — | FAIL — filter chip 仅切 UI 不真过滤 |
| WRG-CARD | 错题卡 | 卡片 | items 非空 | 点击 | navigateTo wrong/analysis | GET /wrong-questions | PASS（接口 OK） |
| WRG-PRAC | 错题练习入口（注：未发现入口按钮，疑似缺失） | 按钮 | items 非空 | 点击 | 创建错题练习会话 | POST /wrong-questions/practice | FAIL — 页面渲染 onPractice 函数但未绑定 UI 入口 |

---

## 11. 错题解析 `pages/wrong/analysis`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| ANA-TAB-Q | 题目 Tab | Tab | 始终 | 点击 | 切 tab='q' | — | PASS |
| ANA-TAB-A | 解析 Tab | Tab | 始终 | 点击 | 切 tab='a' | — | PASS |
| ANA-TAB-K | 相关知识点 Tab | Tab | 始终 | 点击 | 切 tab='k' | — | PASS |
| ANA-ADD-WRONG | ⭐ 加入错题本 | 主按钮 | 始终 | 点击 | Toast「已加入错题本」（注：未真正调 API） | — | FAIL — 仅为 Toast，未调接口 |
| ANA-RETRY | 再练一题 | 主按钮 | 始终 | 点击 | navigateBack | — | PASS |

---

## 12. 学习计划 `pages/study/plan`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| PLAN-EDIT | 编辑 链接 | 文本 | 始终 | 点击 | Toast「编辑计划功能开发中」 | — | PASS（仅为提示） |
| PLAN-TAB-PHASE | 分阶段 Tab | Tab | 数据非空 | 点击 | 切换 tab | — | UNTESTED（数据接口 404） |
| PLAN-TAB-SUBJECT | 分学科 Tab | Tab | 数据非空 | 点击 | 切换 tab | — | UNTESTED |
| — | 接口调用 | — | 始终 | 加载 | GET /api/v1/study-plan | GET /study-plan | **FAIL — HTTP 404** |

---

## 13. 每日一练 `pages/study/daily`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| DAILY-START | 开始练习 / 暂无可练习题组 | 主按钮 | 始终 | 点击 | has_task 时创建 DAILY 会话；否则 Toast | POST /practice-sessions | PASS（接口 OK，daily-task 当前返回 has_task=false） |
| DAILY-WRONG-LNK | 查看错题本 › | 文本链 | 始终 | 点击 | navigateTo wrong | — | PASS |

---

## 14. 打卡日历 `pages/study/checkin`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| CK-PREV | 月份 ‹ | 文本 | 始终 | 点击 | 切换到上一月 | GET /check-ins?year=&month= | **FAIL — HTTP 404** |
| CK-NEXT | 月份 › | 文本 | 始终 | 点击 | 切换到下一月 | GET /check-ins | **FAIL — HTTP 404** |
| CK-DAY | 日期格 | 圆形 | 始终 | 点击 | 未打卡日 → POST /check-ins | POST /check-ins | **FAIL — HTTP 404** |

---

## 15. 学习报告 `pages/learn/report`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| RP-KPI | KPI 卡（4 列） | 展示 | 始终 | — | 显示总会话 / 正确率 / 时长 / 连续 | GET /progress/summary | PASS |
| RP-WEEKLY | 本周进度柱状图 | 展示 | weekly 非空 | — | 渲染 7 根柱子 | GET /progress/weekly | **FAIL — HTTP 404** |

---

## 16. 我的笔记 `pages/learn/notes`

| 元素编号 | 元素名称 | 类型 | 出现条件 | 操作 | 期望反馈 | 期望接口 | 测试状态 |
|---|---|---|---|---|---|---|---|
| NOTES-NEW | 新建笔记 | 按钮 | 始终 | 点击 | Toast「新建笔记功能开发中」 | — | PASS（仅占位） |
| NOTES-LIST | 笔记列表 | 列表 | 接口返回 | 展示 | 显示标题 / 预览 | GET /notes | **FAIL — HTTP 404** |

---

## 17. 错题 / 收藏 / 进度 / 个人 / 反馈（其余）

### 17.1 我的收藏 `pages/favorite/index`
| 元素 | 类型 | 操作 | 期望接口 | 测试状态 |
|---|---|---|---|---|
| FAV-UNFAV | 取消收藏 | DELETE /questions/{qid}/favorite | PASS |

### 17.2 学习总览 `pages/progress/index`
| 元素 | 类型 | 操作 | 期望接口 | 测试状态 |
|---|---|---|---|---|
| — | 加载 | GET /progress/summary | GET /progress/summary | PASS |
| PROG-WEEKLY | 7 天答题折线（注：当前页面没有调用 weekly，依赖 summary 中 last7_answer_count） | GET /progress/weekly | PASS（页面未调 weekly，仅展示 last7_answer_count） |

### 17.3 个人中心 `pages/profile/index`
| 元素 | 类型 | 操作 | 期望接口 | 测试状态 |
|---|---|---|---|---|
| PROF-FAV | 我的收藏 行 | navigateTo favorite | — | PASS |
| PROF-NOTES | 我的笔记 行 | navigateTo learn/notes | — | FAIL — 跳转后目标页因 404 异常 |
| PROF-REPORT | 学习报告 行 | navigateTo learn/report | — | PASS（partial：weekly 404） |
| PROF-CHECKIN | 打卡日历 行 | navigateTo study/checkin | — | FAIL — 跳转后目标页因 404 异常 |
| PROF-FEEDBACK | 帮助与反馈 行 | navigateTo feedback | — | PASS |
| PROF-LOGOUT | 注销账号 | POST /user/logout → reLaunch login | — | PASS（接口存在） |

### 17.4 反馈页 `pages/feedback/index`
| 元素 | 类型 | 操作 | 期望接口 | 测试状态 |
|---|---|---|---|---|
| FB-TYPE-CHIP | 6 种反馈类型 chip | 点击切换 | — | PASS |
| FB-CONTENT | 内容输入 | 必填 | — | PASS |
| FB-SUBMIT | 提交按钮 | 提交 | POST /question-feedback | PASS |

---

## 18. 接口路由与页面调用一致性核查

| 页面 | 调用的接口 | 后端是否实现 | 状态 |
|---|---|---|---|
| login | POST /auth/wechat/login | ✅ 真实（无 Mock） | FAIL — 测试时无 jscode2session，真实 jscode 必失败 |
| onboarding | GET /exam-catalog | ✅ | OK |
| onboarding | POST /user/onboarding | ✅ | OK |
| home | GET /user/exam-targets | ✅ | OK |
| home | GET /practice-sessions/daily-task | ✅ | OK |
| home | GET /progress/summary | ✅ | OK |
| home | POST /practice-sessions | ✅ | OK |
| catalog | GET /exam-catalog | ✅ | OK |
| catalog | POST /practice-sessions | ✅ | OK |
| practice/index | GET /practice-sessions/daily-task | ✅ | OK |
| practice/index | GET /notes | ❌ 404 | **BUG-P1** |
| practice/config | — | 未注册 | **BUG-P2** |
| practice/session | GET /practice-sessions/{id} | ✅ | OK |
| practice/session | PUT /practice-sessions/{id}/answers/{qvid} | ✅ | OK |
| practice/session | POST /practice-sessions/{id}/submit | ✅ | OK |
| practice/session | PUT/DELETE /questions/{qid}/favorite | ✅ | OK |
| practice/result | GET /practice-sessions/{id}/result | ✅ | OK |
| wrong/index | GET /wrong-questions | ✅ | OK |
| wrong/index | POST /wrong-questions/practice | ✅ | OK（函数定义但 UI 无入口） |
| wrong/analysis | GET /practice-sessions/{sessId} | ✅ | OK |
| study/plan | GET /study-plan | ❌ 404 | **BUG-P1** |
| study/daily | GET /practice-sessions/daily-task | ✅ | OK |
| study/checkin | GET /check-ins | ❌ 404 | **BUG-P1** |
| study/checkin | POST /check-ins | ❌ 404 | **BUG-P1** |
| learn/report | GET /progress/summary | ✅ | OK |
| learn/report | GET /progress/weekly | ❌ 404 | **BUG-P1** |
| learn/notes | GET /notes | ❌ 404 | **BUG-P1** |
| favorite/index | GET /favorites | ✅ | OK |
| favorite/index | DELETE /questions/{qid}/favorite | ✅ | OK |
| progress/index | GET /progress/summary | ✅ | OK |
| profile/index | GET /auth/me | ✅ | OK |
| profile/index | POST /user/logout | ✅ | OK |
| feedback/index | POST /question-feedback | ✅ | OK |

---

## 19. 路由注册与入口一致性核查

| 路径 | 是否在 app.config.ts 注册 | 是否有入口 | 一致性 |
|---|---|---|---|
| pages/login/index | ✅ | 启动默认 + 注销 | OK |
| pages/onboarding/index | ✅ | home 无目标时 + guard | OK |
| pages/home/index | ✅ | TabBar | OK |
| pages/catalog/index | ✅ | TabBar + home 搜索 | OK |
| pages/practice/index | ✅ | TabBar | OK |
| pages/practice/config | ❌ 未注册 | practice/index 列表项 `onPractice` 函数引用了此路径 | **BUG-P2** |
| pages/practice/session | ✅ | 多处创建会话后跳转 | OK |
| pages/practice/result | ✅ | 交卷后跳转 | OK |
| pages/wrong/index | ✅ | home 宫格 + practice/index | OK |
| pages/wrong/analysis | ✅ | session ⊕ + wrong/index 卡片 | OK |
| pages/study/plan | ✅ | （无 UI 入口，靠深链） | 注意：profile/profile/index 未指向此页面 |
| pages/study/daily | ✅ | practice/index 「每日一练」 | OK |
| pages/study/checkin | ✅ | profile 打卡日历 链接 | OK |
| pages/learn/report | ✅ | profile 学习报告 行 | OK |
| pages/learn/notes | ✅ | practice/index 我的笔记 + profile | OK |
| pages/favorite/index | ✅ | home 宫格 + profile | OK |
| pages/progress/index | ✅ | （无 UI 入口） | **BUG-P3** |
| pages/profile/index | ✅ | TabBar | OK |
| pages/feedback/index | ✅ | session 反馈 + profile 帮助 | OK |

---

## 20. 主要缺陷汇总

详见 `docs/qa/bug-list.md`。共计 **P0: 0，P1: 5，P2: 4，P3: 2**。