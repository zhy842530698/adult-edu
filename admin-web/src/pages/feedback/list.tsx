import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag, Select, Space } from 'antd';
import { api } from '../../api/client';

const FB_TYPE: Record<string, string> = {
  ANSWER_WRONG: '答案疑似错误',
  ANALYSIS_UNCLEAR: '解析不清',
  STEM_MISSING: '题干缺失',
  OPTION_PROBLEM: '选项问题',
  ASSET_BROKEN: '图片/音频异常',
  OTHER: '其他',
};

export default function FeedbackListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<string | undefined>();
  const [fbType, setFbType] = useState<string | undefined>();

  const load = async () => {
    const r = await api.get('/admin/question-feedback', {
      params: { status, feedback_type: fbType },
    });
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, [status, fbType]);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Select allowClear placeholder="状态" style={{ width: 160 }} value={status} onChange={setStatus}
          options={[
            { label: '待处理', value: 'OPEN' },
            { label: '处理中', value: 'PROCESSING' },
            { label: '已解决', value: 'RESOLVED' },
            { label: '已驳回', value: 'REJECTED' },
          ]} />
        <Select allowClear placeholder="反馈类型" style={{ width: 180 }} value={fbType} onChange={setFbType}
          options={Object.entries(FB_TYPE).map(([v, l]) => ({ label: l, value: v }))} />
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '题目ID', dataIndex: 'question_id', width: 100 },
        { title: '版本ID', dataIndex: 'question_version_id', width: 100 },
        { title: '类型', dataIndex: 'feedback_type', width: 130,
          render: (v) => <Tag>{FB_TYPE[v] || v}</Tag> },
        { title: '内容', dataIndex: 'content', ellipsis: true },
        { title: '状态', dataIndex: 'status', width: 100,
          render: (v) => (
            <Tag color={v === 'RESOLVED' ? 'success' : v === 'PROCESSING' ? 'processing' : 'warning'}>{v}</Tag>
          ) },
        { title: '提交时间', dataIndex: 'created_at', width: 180 },
        {
          title: '操作', fixed: 'right' as const, width: 100, render: (_: any, r: any) => (
            <Link to={`/feedback/${r.id}`}>详情</Link>
          ),
        },
      ]} />
    </div>
  );
}