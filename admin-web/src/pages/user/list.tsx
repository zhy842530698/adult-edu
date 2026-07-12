import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Tag, Popconfirm, Form, message, Modal,
} from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function UserListPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ page: 1, page_size: 20, keyword: '' });
  const [banOpen, setBanOpen] = useState<{ id: number } | null>(null);
  const [banForm] = Form.useForm();

  const load = async () => {
    const params: any = { ...filters };
    Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
    const r = await api.get('/admin/users', { params });
    setItems(r.data.items || []); setTotal(r.data.total || 0);
  };
  useEffect(() => { load(); }, [filters]);

  const ban = async () => {
    const vals = await banForm.validateFields();
    await api.post(`/admin/users/${banOpen!.id}/ban`, { reason: vals.reason });
    message.success('已封禁'); setBanOpen(null); banForm.resetFields(); load();
  };
  const unban = async (id: number) => {
    await api.post(`/admin/users/${id}/unban`);
    message.success('已解封'); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="按昵称搜索"
          enterButton
          allowClear
          style={{ width: 280 }}
          onSearch={(v) => setFilters({ ...filters, keyword: v || undefined, page: 1 })}
        />
      </Space>
      <Table rowKey="id" dataSource={items}
        pagination={{ current: filters.page, pageSize: filters.page_size, total,
          onChange: (page, page_size) => setFilters({ ...filters, page, page_size }) }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: 'openid', dataIndex: 'openid', width: 180 },
          { title: '昵称', dataIndex: 'nickname', width: 160 },
          {
            title: '状态', dataIndex: 'is_banned', width: 110,
            render: (v) => v ? <Tag color="red">封禁</Tag> : <Tag color="green">正常</Tag>,
          },
          { title: '注册时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作', fixed: 'right' as const, width: 200, render: (_: any, r: any) => (
              <Space>
                {hasPerm('user.ban') && !r.is_banned && (
                  <a onClick={() => setBanOpen({ id: r.id })}>封禁</a>
                )}
                {hasPerm('user.ban') && r.is_banned && (
                  <Popconfirm title="确认解封？" onConfirm={() => unban(r.id)}>
                    <a>解封</a>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]} />
      <Modal open={!!banOpen} title="封禁账号" onCancel={() => setBanOpen(null)} onOk={ban} okText="确认封禁" okButtonProps={{ danger: true }}>
        <Form form={banForm} layout="vertical">
          <Form.Item name="reason" label="封禁原因" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}