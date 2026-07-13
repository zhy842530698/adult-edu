import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  BookOutlined,
  UploadOutlined,
  AuditOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined,
  ToolOutlined,
  PictureOutlined,
  TeamOutlined,
  SafetyOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/auth';

const { Header, Sider, Content } = Layout;

type MenuLeaf = { key: string; label: string; perm?: string };
type MenuItem = { key: string; icon: React.ReactNode; label: string; perm?: string; children?: MenuLeaf[] };
const MENU: MenuItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台', perm: 'menu.view' },
  { key: 'cat', icon: <AppstoreOutlined />, label: '考试目录', children: [
    { key: '/catalog/categories', label: '考试方向' },
    { key: '/catalog/exams', label: '考试项目' },
    { key: '/catalog/subjects', label: '科目' },
    { key: '/catalog/chapters', label: '章节' },
    { key: '/catalog/knowledge-points', label: '知识点' },
  ]},
  { key: 'q', icon: <BookOutlined />, label: '题库', children: [
    { key: '/questions', label: '题目列表' },
    { key: '/import', label: '批量导入' },
    { key: '/pdf-tool', label: 'PDF→Excel 工具' },
    { key: '/review', label: '审核中心' },
  ]},
  { key: 'paper', icon: <FileTextOutlined />, label: '试卷', children: [
    { key: '/papers', label: '试卷列表' },
    { key: '/daily', label: '每日一练' },
  ]},
  { key: '/users', icon: <UserOutlined />, label: '用户管理', perm: 'user.query' },
  { key: '/feedback', icon: <ToolOutlined />, label: '纠错工单', perm: 'feedback.query' },
  { key: 'ops', icon: <PictureOutlined />, label: '运营配置', children: [
    { key: '/ops/banners', label: '首页轮播' },
    { key: '/ops/announcements', label: '公告' },
  ]},
  { key: 'admin', icon: <TeamOutlined />, label: '权限', children: [
    { key: '/admin/users', label: '管理员' },
    { key: '/admin/roles', label: '角色' },
  ]},
  { key: '/audit', icon: <AuditOutlined />, label: '审计日志', perm: 'audit.query' },
];

function flatten(items: any[], path = ''): any[] {
  const out: any[] = [];
  for (const it of items) {
    if (it.children) out.push(...flatten(it.children, it.key));
    else out.push(it);
  }
  return out;
}

export default function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { admin, logout, hasPerm } = useAuthStore();

  const items = MENU.filter((m) => !m.perm || hasPerm(m.perm)).map((m) => {
    if (m.children) {
      const kids = m.children.filter((c) => !c.perm || hasPerm(c.perm));
      return { key: m.key, icon: m.icon, label: m.label, children: kids.map((k) => ({ key: k.key, label: <Link to={k.key}>{k.label}</Link> })) };
    }
    return { key: m.key, icon: m.icon, label: <Link to={m.key}>{m.label}</Link> };
  });

  const selectedKey = '/' + loc.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  const flat = flatten(MENU).map((m) => m.key);
  const currentKey = flat.includes(loc.pathname) ? loc.pathname : selectedKey;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ color: '#fff', padding: 16, textAlign: 'center', fontWeight: 'bold' }}>
          {collapsed ? '刷题' : '成人教育刷题后台'}
        </div>
        <Menu theme="dark" mode="inline" items={items} selectedKeys={[currentKey]} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span style={{ fontSize: 16 }}>运营管理后台</span>
          </Space>
          <Dropdown menu={{
            items: [
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); nav('/login'); } },
            ],
          }}>
            <Space>
              <Avatar icon={<SafetyOutlined />} />
              <span>{admin?.display_name || admin?.username}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 16, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}