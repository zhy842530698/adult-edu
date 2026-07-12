import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Select, Space, Popconfirm, message, Tag,
} from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function AdminUsersPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [items, setItems] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/admin/admin-users'), api.get('/admin/roles')]);
    setItems(a.data.items || []); setRoles(b.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: any) => {
    await api.post('/admin/admin-users', vals);
    message.success('已创建'); setOpen(false); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        {hasPerm('admin.create') && (
          <Button type="primary" onClick={() => setOpen(true)}>新增管理员</Button>
        )}
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: '账号', dataIndex: 'username' },
        { title: '姓名', dataIndex: 'display_name' },
        {
          title: '超管', dataIndex: 'is_super_admin', width: 100,
          render: (v) => v ? <Tag color="gold">超管</Tag> : '-',
        },
        {
          title: '角色', dataIndex: 'roles', render: (v: string[]) => (
            <Space>{v?.map((r) => <Tag key={r}>{r}</Tag>)}</Space>
          ),
        },
        {
          title: '操作', fixed: 'right' as const, width: 120, render: (_: any, r: any) => (
            hasPerm('admin.delete') ? (
              <Popconfirm title="删除管理员？" onConfirm={async () => {
                await api.delete(`/admin/admin-users/${r.id}`); message.success('已删除'); load();
              }}><a>删除</a></Popconfirm>
            ) : null
          ),
        },
      ]} />

      <Modal open={open} title="新增管理员" onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input />
          </Form.Item>
          <Form.Item name="is_super_admin" label="超级管理员" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="role_ids" label="角色">
            <Select mode="multiple" options={roles.map((r) => ({ label: r.name, value: r.id }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}