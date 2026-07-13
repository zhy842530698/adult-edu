import React, { useEffect, useState } from 'react';
import { Table, Input, Space, Tag } from 'antd';
// src/pages/audit.tsx
import { api } from "../api/client";

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    const r = await api.get('/admin/audit-logs', { params: { action: action || undefined, page, page_size: 50 } });
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, [action, page]);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          placeholder="按 action 过滤 (如 question.approve)"
          enterButton
          style={{ width: 320 }}
          onSearch={(v) => { setAction(v); setPage(1); }}
        />
      </Space>
      <Table rowKey="id" dataSource={items}
        pagination={{ current: page, pageSize: 50, onChange: setPage }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '管理员', dataIndex: 'admin_user_id', width: 100 },
          { title: 'Action', dataIndex: 'action', render: (v) => <Tag>{v}</Tag> },
          { title: '对象类型', dataIndex: 'target_type', width: 140 },
          { title: '对象ID', dataIndex: 'target_id', width: 140 },
          { title: 'IP', dataIndex: 'ip', width: 140 },
          { title: 'RequestID', dataIndex: 'request_id', width: 220 },
          { title: '时间', dataIndex: 'created_at', width: 180 },
        ]} />
    </div>
  );
}