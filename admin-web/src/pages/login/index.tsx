import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (vals: { username: string; password: string }) => {
    setLoading(true);
    try {
      const resp = await api.post<{ token: string; admin: any }>('/admin/auth/login', vals);
      setAuth(resp.data.token, resp.data.admin);
      message.success(`欢迎回来，${resp.data.admin.display_name || resp.data.admin.username}`);
      nav('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          运营管理后台
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ username: 'admin', password: 'Admin@123' }}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
          默认超级管理员：admin / Admin@123
        </Typography.Text>
      </Card>
    </div>
  );
}