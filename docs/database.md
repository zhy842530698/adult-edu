# 数据库 ER 图

## 核心实体

```
exam_categories ─< exams ─< subjects ─< chapters ─< knowledge_points
                                                │
                                                │ (via question_knowledge_points)
                                                ▼
                                  question_versions >─ question_options
                                  ▲
                                  │ (current_version_id, latest_version_no)
                                  │
                              questions
                                  ▲
                                  │
              ┌───────────────────┼─────────────────────────┐
              │                   │                         │
        session_questions   question_review_records   question_feedback
              │                                             │
              ▼                                             ▼
        practice_sessions                            feedback_replies
              │
              ▼
        user_answers
              │
              ▼
        user_question_states  (wrong / favorite / mastery)

users >─ user_exam_targets (primary + daily_question_goal)
users >─ user_daily_stats (每日聚合)
papers >─ paper_versions >─ paper_questions (binding question_version_id)
```

## 关键约束

- `questions(current_version_id)` 指向已发布版本（外键）
- `question_versions(question_id, version_no)` 唯一
- `question_options(question_version_id, option_code)` 唯一
- `user_answers(session_id, question_version_id)` 唯一
- `user_question_states(user_id, question_id)` 唯一
- `paper_questions(paper_version_id, sequence_no)` 唯一
- `user_exam_targets(user_id, exam_id)` 唯一
- 已发布 `question_versions`、`practice_sessions`、`session_questions`、`user_answers`、`audit_logs` 均**禁止物理删除**

## 状态机

### 题目版本
```
DRAFT ──submit_review──▶ REVIEW_PENDING ──approve──▶ PUBLISHED ──offline──▶ OFFLINE
   ▲                          │                                        
   └────────── reject ────────┘                                         
                              ▼                                        
                          REJECTED                                       
```

### 练习会话
```
CREATED ──fill answers──▶ IN_PROGRESS ──submit──▶ SUBMITTED (终态)
                              │
                              └──────────── pause/resume ────────────┐
                                                                  (in-memory)
```

### 用户反馈
```
OPEN ──reply──▶ PROCESSING ──resolve──▶ RESOLVED
                │
                └──── reject ──▶ REJECTED
```

### 导入任务
```
UPLOADED ──parse──▶ PARSED ──confirm──▶ CONFIRMED
                  │                  ▲
                  └── parse error ──▶ FAILED
```

## 关键表字段

```sql
-- 题目版本
question_versions:
  id, question_id, version_no,
  status ENUM('DRAFT','REVIEW_PENDING','PUBLISHED','OFFLINE','REJECTED'),
  stem TEXT, analysis TEXT,
  correct_options JSON,  -- ["A","C"]
  score FLOAT, scoring_rule VARCHAR,
  source_name, source_year, source_question_no,
  license_type, external_ref,
  published_by, published_at,
  created_by, created_at, updated_at

-- 练习会话
practice_sessions:
  id, user_id, exam_id, paper_id,
  mode VARCHAR, status VARCHAR,
  total_score FLOAT, awarded_score FLOAT,
  correct_count INT, wrong_count INT, unanswered_count INT,
  started_at, submitted_at, updated_at

-- 会话-题目快照（绑定版本）
session_questions:
  id, session_id, question_id, question_version_id,
  sequence_no INT, score FLOAT,
  scoring_rule VARCHAR, analysis_display_rule VARCHAR

-- 用户答案
user_answers:
  id, session_id, question_version_id,
  selected_options JSON,
  is_correct BOOL, awarded_score FLOAT,
  time_spent_seconds INT, submit_count INT,
  answered_at

-- 用户-题目状态
user_question_states:
  user_id, question_id,
  wrong_count INT, correct_count INT, consecutive_correct INT,
  mastered BOOL,
  is_favorite BOOL,
  first_wrong_at, last_wrong_at, next_review_at

-- 后台审计
audit_logs:
  id, admin_user_id, action VARCHAR, target_type, target_id,
  before JSON, after JSON,
  ip, request_id, created_at
```

## 默认索引

- `questions(exam_id, subject_id, chapter_id)` 复合索引（在数据量大后由 DBA 评估添加）
- `user_answers(session_id, question_version_id)` 唯一索引（建模约束）
- `audit_logs(admin_user_id, created_at DESC)`