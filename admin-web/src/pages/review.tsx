import React, { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Input, Form, message, Tooltip, Alert,
} from 'antd';
import dayjs from 'dayjs';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

const QUESTION_TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: '单选',
  MULTIPLE_CHOICE: '多选',
};

// Chinese-formatted timestamp: 2026年07月13日 13:51:52
function formatCn(s: string | null | undefined): string {
  if (!s) return '-';
  const d = dayjs(s);
  return d.isValid() ? d.format('YYYY年MM月DD日 HH:mm:ss') : '-';
}

const TYPE_TAG: Record<string, string> = {
  PENDING: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  PLATFORM_ORIGINAL: '平台原创',
  REAL_EXAM: '真题',
  MOCK: '模拟题',
  COMPILATION: '资料汇编',
};

const SOURCE_TYPE_TAG_COLOR: Record<string, string> = {
  PLATFORM_ORIGINAL: 'default',
  REAL_EXAM: 'green',
  MOCK: 'blue',
  COMPILATION: 'orange',
};

function SourceBadge({ source_type, real_exam_year }: { source_type?: string | null; real_exam_year?: number | null }) {
  if (!source_type) return <span style={{ color: '#999' }}>-</span>;
  if (source_type === 'REAL_EXAM' && real_exam_year) {
    return <Tag color="green">{real_exam_year}年 真题</Tag>;
  }
  return <Tag color={SOURCE_TYPE_TAG_COLOR[source_type] || 'default'}>{SOURCE_TYPE_LABEL[source_type] || source_type}</Tag>;
}

export default function ReviewPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [rejectOpen, setRejectOpen] = useState<{ id: number } | null>(null);
  const [rejectForm] = Form.useForm();

  const load = async () => {
    const r = await api.get('/admin/question-reviews');
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    Modal.confirm({
      title: '确认通过审核',
      content: '通过后将生成已发布版本，可在题库中查看。',
      okText: '确认',
      onOk: async () => {
        await api.post(`/admin/question-reviews/${id}/approve`);
        message.success('已通过'); load();
      },
    });
  };

  const batchApprove = async () => {
    if (!selected.length) return;
    Modal.confirm({
      title: `批量通过 ${selected.length} 条审核`,
      content: '通过后将生成已发布版本，可被 C 端抽到。已处理 / 缺权限的项会被跳过。',
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        const r = await api.post('/admin/question-reviews/batch/approve', { ids: selected });
        const approved = r.data.results.filter((x: any) => x.status === 'approved').length;
        const skipped = r.data.results.filter((x: any) => x.status === 'skipped').length;
        const failed = r.data.results.filter((x: any) => x.status === 'error').length;
        const parts: string[] = [];
        if (approved) parts.push(`通过 ${approved}`);
        if (skipped) parts.push(`跳过 ${skipped}`);
        if (failed) parts.push(`失败 ${failed}`);
        message.success(parts.length ? parts.join('，') : '无可处理项');
        setSelected([]);
        load();
      },
    });
  };

  const reject = async () => {
    const vals = await rejectForm.validateFields();
    await api.post(
      `/admin/question-reviews/${rejectOpen!.id}/reject`,
      { reason: vals.reason },
    );
    message.success('已驳回');
    setRejectOpen(null);
    rejectForm.resetFields();
    load();
  };

  return (
    <div>
      {hasPerm('question.review_approve') && (
        <Space style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            disabled={!selected.length}
            onClick={batchApprove}
          >
            批量通过 ({selected.length})
          </Button>
          {selected.length > 0 && (
            <Alert
              type="info"
              showIcon
              message={`已选 ${selected.length} 条（仅 PENDING 可被通过）`}
              style={{ padding: '4px 12px' }}
            />
          )}
        </Space>
      )}
      <Table
        rowKey="id"
        dataSource={items}
        scroll={{ x: 1500 }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as number[]),
          getCheckboxProps: (record) => ({
            disabled: record.decision !== 'PENDING' || !hasPerm('question.review_approve'),
          }),
        }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        columns={[
          { title: '审核ID', dataIndex: 'id', width: 80, fixed: 'left' },
          {
            title: '题干内容',
            dataIndex: 'question_stem',
            width: 360,
            ellipsis: { showTitle: false },
            render: (v) =>
              v ? (
                <Tooltip placement="topLeft" title={v}>
                  <span>{v}</span>
                </Tooltip>
              ) : (
                <span style={{ color: '#999' }}>（已删除）</span>
              ),
          },
          {
            title: '题型',
            dataIndex: 'question_type',
            width: 80,
            render: (v) =>
              v ? <Tag color="blue">{QUESTION_TYPE_LABEL[v] || v}</Tag> : '-',
          },
          {
            title: '来源',
            dataIndex: 'source_type',
            width: 120,
            render: (_: any, r: any) => <SourceBadge source_type={r.source_type} real_exam_year={r.real_exam_year} />,
          },
          {
            title: '正确答案',
            dataIndex: 'correct_options',
            width: 140,
            render: (arr: string[] | null | undefined) => {
              if (!arr || !arr.length) return '-';
              return (
                <Space size={4} wrap>
                  {arr.map((c) => (
                    <Tag color="green" key={c}>{c}</Tag>
                  ))}
                </Space>
              );
            },
          },
          {
            title: '提交人',
            dataIndex: 'submitter_name',
            width: 120,
            render: (v, r) => v || <span style={{ color: '#999' }}>#{r.submitted_by}</span>,
          },
          {
            title: '决定',
            dataIndex: 'decision',
            width: 100,
            render: (v) => <Tag color={TYPE_TAG[v] || 'default'}>{v}</Tag>,
          },
          {
            title: '驳回原因',
            dataIndex: 'reject_reason',
            width: 200,
            ellipsis: { showTitle: false },
            render: (v) =>
              v ? (
                <Tooltip placement="topLeft" title={v}>
                  <span style={{ color: '#cf1322' }}>{v}</span>
                </Tooltip>
              ) : (
                '-'
              ),
          },
          {
            title: '审核人',
            dataIndex: 'reviewer_name',
            width: 120,
            render: (v, r) => v || <span style={{ color: '#999' }}>{r.reviewer_id ? `#${r.reviewer_id}` : '-'}</span>,
          },
          {
            title: '提交时间',
            dataIndex: 'submitted_at',
            width: 180,
            render: (v) => formatCn(v),
          },
          {
            title: '审核时间',
            dataIndex: 'reviewed_at',
            width: 180,
            render: (v) => formatCn(v),
          },
          {
            title: '操作',
            fixed: 'right' as const,
            width: 180,
            render: (_: any, r: any) => (
              <Space>
                {r.decision === 'PENDING' && hasPerm('question.review_approve') && (
                  <Button size="small" type="primary" onClick={() => approve(r.id)}>通过</Button>
                )}
                {r.decision === 'PENDING' && hasPerm('question.review_reject') && (
                  <Button size="small" danger onClick={() => setRejectOpen({ id: r.id })}>驳回</Button>
                )}
                {r.decision !== 'PENDING' && (
                  <span style={{ color: '#999' }}>已处理</span>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={!!rejectOpen}
        title="驳回审核"
        onCancel={() => setRejectOpen(null)}
        onOk={reject}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={4} placeholder="请清晰描述驳回原因，便于录入员改进" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
