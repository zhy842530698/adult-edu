import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table, Button, Form, Input, Select, Space, Tag, Popconfirm, InputNumber, message,
} from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const STATUS_TAG: Record<string, string> = {
  DRAFT: 'default',
  REVIEW_PENDING: 'processing',
  PUBLISHED: 'success',
  OFFLINE: 'warning',
  REJECTED: 'error',
};

export default function QuestionListPage() {
  const nav = useNavigate();
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [filters, setFilters] = useState<any>({ page: 1, page_size: 20 });
  const [form] = Form.useForm();

  const load = async () => {
    const params: any = { ...filters };
    Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
    const resp = await api.get('/admin/questions', { params });
    setItems(resp.data.items || []);
    setTotal(resp.data.total || 0);
  };

  useEffect(() => {
    api.get('/admin/exams').then((r) => setExams(r.data.items || []));
    api.get('/admin/subjects').then((r) => setSubjects(r.data.items || []));
    api.get('/admin/chapters').then((r) => setChapters(r.data.items || []));
  }, []);

  useEffect(() => { load(); }, [filters]);

  const onSearch = (vals: any) => setFilters({ ...filters, ...vals, page: 1 });

  const offline = async (id: number) => {
    await api.post(`/admin/questions/${id}/offline`);
    message.success('已下架'); load();
  };

  const submitReview = async (id: number, versionId: number) => {
    await api.post(`/admin/questions/${id}/submit-review`, null, { params: { version_id: versionId } });
    message.success('已提交审核'); load();
  };

  const batchTag = async () => {
    const tag = window.prompt('请输入要追加的标签');
    if (!tag) return;
    await api.post('/admin/questions/batch', { ids: selected, action: 'tag', tag });
    message.success('已更新标签'); setSelected([]); load();
  };

  return (
    <div>
      <Form form={form} layout="inline" onFinish={onSearch} style={{ marginBottom: 12 }}>
        <Form.Item name="keyword"><Input placeholder="题干关键词" allowClear /></Form.Item>
        <Form.Item name="exam_id">
          <Select allowClear placeholder="考试" style={{ width: 160 }}
            options={exams.map((e) => ({ label: e.name, value: e.id }))} />
        </Form.Item>
        <Form.Item name="subject_id">
          <Select allowClear placeholder="科目" style={{ width: 140 }}
            options={subjects.map((s) => ({ label: s.name, value: s.id }))} />
        </Form.Item>
        <Form.Item name="chapter_id">
          <Select allowClear placeholder="章节" style={{ width: 140 }}
            options={chapters.map((c) => ({ label: c.name, value: c.id }))} />
        </Form.Item>
        <Form.Item name="question_type">
          <Select allowClear placeholder="题型" style={{ width: 120 }}
            options={[{ label: '单选', value: 'SINGLE_CHOICE' }, { label: '多选', value: 'MULTIPLE_CHOICE' }]} />
        </Form.Item>
        <Form.Item name="status">
          <Select allowClear placeholder="状态" style={{ width: 120 }}
            options={[
              { label: '草稿', value: 'DRAFT' },
              { label: '待审核', value: 'REVIEW_PENDING' },
              { label: '已发布', value: 'PUBLISHED' },
              { label: '已下架', value: 'OFFLINE' },
            ]} />
        </Form.Item>
        <Form.Item name="difficulty">
          <InputNumber min={1} max={5} placeholder="难度" style={{ width: 90 }} />
        </Form.Item>
        <Button type="primary" htmlType="submit">搜索</Button>
        <Button onClick={() => { form.resetFields(); setFilters({ page: 1, page_size: 20 }); }}>重置</Button>
      </Form>

      <Space style={{ marginBottom: 12 }}>
        {hasPerm('question.create') && (
          <Button type="primary" onClick={() => nav('/questions/new')}>新增题目</Button>
        )}
        {hasPerm('question.edit') && (
          <Button disabled={!selected.length} onClick={batchTag}>批量打标签 ({selected.length})</Button>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={items}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
        pagination={{
          current: filters.page,
          pageSize: filters.page_size,
          total,
          onChange: (page, page_size) => setFilters({ ...filters, page, page_size }),
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          {
            title: '题型', dataIndex: 'question_type', width: 80,
            render: (v) => v === 'SINGLE_CHOICE' ? <Tag color="blue">单选</Tag> : <Tag color="purple">多选</Tag>,
          },
          { title: '考试', dataIndex: 'exam_id', width: 140, render: (v) => exams.find((e) => e.id === v)?.name },
          { title: '科目', dataIndex: 'subject_id', width: 120, render: (v) => subjects.find((s) => s.id === v)?.name },
          { title: '难度', dataIndex: 'difficulty', width: 70 },
          { title: '当前版本', dataIndex: 'current_version_id', width: 100 },
          {
            title: '状态', dataIndex: 'version_status', width: 110,
            render: (v) => <Tag color={STATUS_TAG[v] || 'default'}>{v || '-'}</Tag>,
          },
          { title: '标签', dataIndex: 'tags' },
          {
            title: '操作', fixed: 'right' as const, width: 280, render: (_: any, r: any) => (
              <Space size="small">
                {hasPerm('question.edit') && (
                  <Link to={`/questions/${r.id}/edit`}>编辑</Link>
                )}
                {r.version_status === 'DRAFT' && hasPerm('question.submit_review') && (
                  <a onClick={() => submitReview(r.id, r.current_version_id)}>提交审核</a>
                )}
                {r.version_status === 'PUBLISHED' && hasPerm('question.offline') && (
                  <Popconfirm title="下架后不入新会话，确认？" onConfirm={() => offline(r.id)}>
                    <a>下架</a>
                  </Popconfirm>
                )}
                {hasPerm('question.delete') && r.version_status === 'DRAFT' && (
                  <Popconfirm title="确定删除草稿？" onConfirm={async () => {
                    await api.delete(`/admin/questions/${r.id}`); message.success('已删除'); load();
                  }}><a>删除</a></Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}