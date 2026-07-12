import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function PaperListPage() {
  const nav = useNavigate();
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const r = await api.get('/admin/papers');
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const publish = async (id: number) => {
    await api.post(`/admin/papers/${id}/publish`);
    message.success('已发布'); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        {hasPerm('paper.create') && (
          <Button type="primary" onClick={() => nav('/papers/new')}>新建试卷</Button>
        )}
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '标题', dataIndex: 'title' },
        {
          title: '类型', dataIndex: 'paper_type', width: 110,
          render: (v) => <Tag>{v}</Tag>,
        },
        {
          title: '已发布', dataIndex: 'is_published', width: 100,
          render: (v) => v ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>,
        },
        { title: '考试ID', dataIndex: 'exam_id', width: 100 },
        { title: '创建时间', dataIndex: 'created_at', width: 180 },
        {
          title: '操作', fixed: 'right' as const, width: 260, render: (_: any, r: any) => (
            <Space>
              <Link to={`/papers/${r.id}/edit`}>编辑</Link>
              {!r.is_published && hasPerm('paper.publish') && (
                <Popconfirm title="发布后题目版本会固化，确认？" onConfirm={() => publish(r.id)}>
                  <a>发布</a>
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ]} />
    </div>
  );
}