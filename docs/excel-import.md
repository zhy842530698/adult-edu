# Excel 导入规范

## 字段定义

| 字段 | 必填 | 示例 | 校验规则 |
|---|:---:|---|---|
| `exam_code` | 是 | `CET4` | 必须在 `exams` 表中存在；不存在则整行错误 |
| `subject_code` | 是 | `LISTENING` | 必须属于 `exam_code` 对应的考试 |
| `chapter_code` | 否 | `LONG_DIALOGUE` | 必须属于 `subject_code` 对应的科目 |
| `knowledge_codes` | 否 | `MAIN_IDEA,DETAIL` | 英文逗号分隔；每个编码必须属于 `chapter_code` 对应的章节 |
| `question_type` | 是 | `SINGLE_CHOICE` | 仅接受 `SINGLE_CHOICE` / `MULTIPLE_CHOICE` |
| `stem` | 是 | `<p>...题干...</p>` | 非空；经 HTML 白名单清洗 |
| `option_a`..`option_h` | 至少 2 项 | `订酒店` | 顺序填空；至少 2 个非空项；单选最多 8、多选 3-8 |
| `answer` | 是 | `A` / `A,C` | 单选必须有 1 个；多选至少 2 个；全部必须命中已填选项编码 |
| `analysis` | 是 | `<p>解析...</p>` | 非空；经 HTML 白名单清洗 |
| `difficulty` | 是 | `3` | 整数 1-5 |
| `score` | 是 | `2.0` | 正数 |
| `source_name` | 是 | `CET4-2023-06` 或 `平台原创` | 非空 |
| `source_year` | 否 | `2023` | 整数 |
| `source_question_no` | 否 | `1-A` | 字符串 |
| `license_type` | 是 | `platform-original` | 非空 |
| `external_ref` | 否 | | 字符串 |
| `tags` | 否 | `听力,长对话` | 英文逗号分隔 |

## 流程

```
上传 Excel → 创建 import_jobs 行
           → 逐行解析 + 校验 → 写 import_job_rows
           → 状态 = PARSED（前端预览 OK/Error）
           → 运营确认 → 调用 /confirm
           → 仅对 OK 行调用 create_draft + submit_for_review
           → 状态 = CONFIRMED（可去审核中心发布）
```

## 错误行示例

```json
{
  "row_no": 12,
  "status": "ERROR",
  "errors": [
    "单选题正确答案必须恰好 1 个",
    "选项编码 A 不存在"
  ]
}
```

## 下载模板

```bash
make template
# 产物：docs/excel-import-template.xlsx
```

模板含 1 行示例 + 「字段说明」sheet，运营直接照葫芦画瓢。

## 幂等

- 同一任务重复调用 `/admin/import-jobs/{id}/confirm` 不会重复生成题目（服务端检查 `confirmed_question_count`）。
- 重传相同文件建议使用相同 `exam_code + source_name + source_year + source_question_no + external_ref` 做业务键（运营侧），后续可扩展去重。