import React, { useState } from 'react';
import {
  Card, Form, Input, InputNumber, Switch, Select, Upload, Button,
  Space, Alert, Typography, message, Tooltip, Statistic, Row, Col,
} from 'antd';
import { InboxOutlined, DownloadOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

const { Dragger } = Upload;

interface ConvertSummary {
  filename: string;
  questions: number;
  ok: number;
  missingAnswer: number;
  pages: number;
  warning?: string;
}

/**
 * PDF -> Excel 工具页
 *
 * 工作流：
 *   1. 填表单（年份 / 是否真题 / 来源 / 分值 / license / 备注）
 *   2. 上传 PDF（仅文字型，扫描件不行）
 *   3. 后端解析 → 返回 .xlsx，按现有导入模板字段填好
 *   4. 浏览器直接下载 Excel
 *   5. 后续可走「批量导入」页继续确认落库
 */
export default function PdfToolPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [form] = Form.useForm();
  const [converting, setConverting] = useState(false);
  const [summary, setSummary] = useState<ConvertSummary | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const onConvert = async (vals: any) => {
    if (!pdfFile) {
      message.warning('请先选择 PDF 文件');
      return;
    }
    setConverting(true);
    setSummary(null);
    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      fd.append('exam_code', vals.exam_code);
      fd.append('subject_code', vals.subject_code);
      fd.append('source_year', vals.source_year ? String(vals.source_year) : '');
      fd.append('is_real_exam', vals.is_real_exam ? 'true' : 'false');
      fd.append('remark', vals.remark || '');
      fd.append('source_name', vals.source_name || '');
      fd.append('license_type', vals.license_type || 'platform-original');
      fd.append('chapter_code', vals.chapter_code || '');
      fd.append('knowledge_codes', vals.knowledge_codes || '');
      fd.append('difficulty', String(vals.difficulty ?? 3));
      fd.append('score', String(vals.score ?? 2.0));

      const resp = await api.post('/admin/pdf-tools/convert', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const detected = Number(resp.headers['x-questions-detected'] || 0);
      const ok = Number(resp.headers['x-questions-ok'] || 0);
      const missing = Number(resp.headers['x-questions-missing-answer'] || 0);
      const pages = Number(resp.headers['x-pdf-pages'] || 0);
      const warning = resp.headers['x-pdf-warning'];

      // pull filename from Content-Disposition
      const cd = resp.headers['content-disposition'] || '';
      const m = cd.match(/filename="([^"]+)"/);
      const fname = m?.[1] || `${vals.exam_code}-${vals.subject_code}.xlsx`;

      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);

      setSummary({ filename: fname, questions: detected, ok, missingAnswer: missing, pages, warning });
      message.success(`已生成 Excel，共 ${detected} 道题`);
    } catch (e: any) {
      const blob = e?.response?.data as Blob | undefined;
      if (blob && blob.type?.includes('json')) {
        try {
          const txt = await blob.text();
          const j = JSON.parse(txt);
          message.error(j.message || '转换失败');
        } catch {
          message.error('转换失败');
        }
      } else {
        const detail = e?.response?.data?.message || e?.message || '转换失败';
        message.error(detail);
      }
    } finally {
      setConverting(false);
    }
  };

  const uploadProps = {
    name: 'file',
    accept: '.pdf',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        message.error('仅支持 PDF 文件');
        return false;
      }
      setPdfFile(file);
      setSummary(null);
      return false;  // we submit via form below, not via AntD
    },
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <FilePdfOutlined />
            <span>PDF 试卷 → Excel 工具</span>
          </Space>
        }
        extra={
          <Tooltip title="把试卷 PDF 转成可导入题库的 Excel；之后走「批量导入」即可落库">
            <Typography.Text type="secondary">使用说明</Typography.Text>
          </Tooltip>
        }
      >
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16 }}
          message={
            <span>
              支持识别题号 <code>1.&nbsp;2.</code> / <code>第1题</code> / <code>(1)</code>，
              选项 <code>A.</code> / <code>(A)</code> / <code>A、</code>，
              答案 <code>答案：A</code> / <code>Answer: A</code>，
              解析 <code>解析：...</code> / <code>【解析】...</code>。
              <strong style={{ marginLeft: 8 }}>扫描件/图片型 PDF 无法识别</strong>。
            </span>
          }
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onConvert}
          initialValues={{
            is_real_exam: true,
            difficulty: 3,
            score: 2.0,
            license_type: 'platform-original',
          }}
          disabled={!hasPerm('question.import')}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="exam_code" label="考试编码" rules={[{ required: true, message: '请填写考试编码，如 EN / CET4' }]}>
                <Input placeholder="EN / CET4 / GOV" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="subject_code" label="科目编码" rules={[{ required: true, message: '请填写科目编码，如 LISTENING' }]}>
                <Input placeholder="LISTENING / READING / 行测" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="source_year" label="试卷年份">
                <InputNumber min={1990} max={2100} placeholder="如 2023" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="is_real_exam" label="是否真题" valuePropName="checked">
                <Switch checkedChildren="真题" unCheckedChildren="模拟" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="source_name" label="来源名称" tooltip="留空则按 考试编码-年份 自动生成">
                <Input placeholder="例：CET4-2023-06；留空则自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="license_type" label="授权类型" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'platform-original', label: '平台原创（platform-original）' },
                    { value: 'public-domain', label: '公有领域（public-domain）' },
                    { value: 'cc-by-sa', label: 'CC-BY-SA' },
                    { value: 'permission', label: '已获授权（permission）' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="chapter_code" label="章节编码" tooltip="选填；如 LONG_DIALOGUE">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="knowledge_codes" label="知识点编码" tooltip="选填；多个用英文逗号分隔">
                <Input placeholder="MAIN_IDEA,DETAIL" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="difficulty" label="默认难度" rules={[{ required: true }]}>
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="score" label="默认分值" rules={[{ required: true }]}>
                <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="备注 / 标签" tooltip="会写入 Excel 的 tags 字段，便于筛选">
            <Input placeholder="例：6 月真题 / 春季模拟" />
          </Form.Item>

          <Form.Item label="PDF 文件" required>
            <Dragger {...uploadProps} disabled={!hasPerm('question.import')} style={{ padding: 12 }}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">
                {pdfFile ? `已选择：${pdfFile.name}（${(pdfFile.size / 1024).toFixed(1)} KB）` : '点击或将 PDF 拖拽到这里上传'}
              </p>
              <p className="ant-upload-hint">仅支持 .pdf；建议先在 PDF 阅读器里确认是「文字型」而非扫描件</p>
            </Dragger>
            {pdfFile && (
              <Button
                size="small"
                type="link"
                icon={<ReloadOutlined />}
                onClick={() => { setPdfFile(null); setSummary(null); }}
                style={{ paddingLeft: 0 }}
              >
                重新选择
              </Button>
            )}
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              loading={converting}
              disabled={!hasPerm('question.import') || !pdfFile}
              onClick={() => form.submit()}
            >
              转换并下载 Excel
            </Button>
            {!hasPerm('question.import') && (
              <Typography.Text type="danger" style={{ marginLeft: 12 }}>
                当前账号没有 question.import 权限
              </Typography.Text>
            )}
          </Form.Item>
        </Form>
      </Card>

      {summary && (
        <Card style={{ marginTop: 16 }} title="转换结果">
          <Row gutter={16}>
            <Col span={6}><Statistic title="文件名" value={summary.filename} /></Col>
            <Col span={4}><Statistic title="PDF 页数" value={summary.pages} /></Col>
            <Col span={4}><Statistic title="识别题数" value={summary.questions} /></Col>
            <Col span={4}><Statistic title="完整题数" value={summary.ok} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col span={4}><Statistic title="缺答案题数" value={summary.missingAnswer} valueStyle={{ color: summary.missingAnswer ? '#faad14' : undefined }} /></Col>
          </Row>
          {summary.missingAnswer > 0 && (
            <Alert
              style={{ marginTop: 16 }}
              showIcon
              type="warning"
              message={`${summary.missingAnswer} 道题在 PDF 中未识别到答案，请在下载的 Excel 中手动补齐 answer 列后，再走「批量导入」流程`}
            />
          )}
          {summary.warning && (
            <Alert style={{ marginTop: 12 }} type="info" showIcon message={summary.warning} />
          )}
          <Alert
            style={{ marginTop: 12 }}
            type="success"
            showIcon
            message={
              <span>
                已下载 <b>{summary.filename}</b>。下一步：前往 <a href="/import">批量导入</a>，上传这个 Excel 文件，确认后写入草稿表。
              </span>
            }
          />
        </Card>
      )}
    </div>
  );
}