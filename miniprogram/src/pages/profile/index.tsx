import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import { getUser, logout } from '../../store/auth';
import Icon from '../../components/Icon';

interface MenuItem {
  icon: 'star' | 'notes' | 'chart' | 'medal' | 'cloud' | 'settings';
  label: string;
  path: string;
}

const MENU: MenuItem[] = [
  { icon: 'star',    label: '我的收藏',     path: '/pages/favorite/index' },
  { icon: 'notes',   label: '我的笔记',     path: '/pages/learn/notes' },
  { icon: 'chart',   label: '学习报告',     path: '/pages/learn/report' },
  { icon: 'medal',   label: '兑换码',       path: '' },
  { icon: 'cloud',   label: '帮助与反馈',   path: '/pages/feedback/index' },
  { icon: 'settings',label: '关于我们',     path: '' },
];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(getUser());

  useEffect(() => {
    if (!user) {
      api.get<any>('/auth/me').then((u) => setUser(u)).catch(() => {});
    }
  }, []);

  const onLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确认要注销账号吗？',
      success: async (r) => {
        if (!r.confirm) return;
        try { await api.post('/user/logout', {}); } catch {}
        logout();
        Taro.reLaunch({ url: '/pages/login/index' });
      },
    });
  };

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* 顶部品牌区 */}
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '32rpx', color: 'var(--ink-mid)' }}>我的</Text>
      </View>

      {/* 用户卡 */}
      <View style={{ margin: '0 32rpx 24rpx', display: 'flex', alignItems: 'center' }}>
        <View style={{
          width: '112rpx', height: '112rpx', borderRadius: '999rpx',
          background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
          color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '56rpx', marginRight: 24,
        }}>
          👤
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>
            {user?.nickname || '学习用户'}
          </Text>
          <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 6 }}>
            ID: {user?.id || '未登录'}
          </Text>
          <View style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center',
            background: 'var(--orange-soft)', color: 'var(--orange)',
            padding: '4rpx 16rpx', borderRadius: '999rpx',
            fontSize: '22rpx', fontWeight: 600,
          }}>
            <Text style={{ marginRight: 4 }}>🏅</Text>Lv.3
          </View>
        </View>
        <View
          style={{
            background: 'var(--brand-soft)',
            color: 'var(--brand)',
            padding: '12rpx 24rpx',
            borderRadius: '999rpx',
            fontSize: '24rpx',
            fontWeight: 600,
          }}
          onClick={() => Taro.navigateTo({ url: '/pages/study/checkin' })}
        >打卡日历</View>
      </View>

      {/* 会员中心 金色横幅 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: 'linear-gradient(135deg, #F59E0B 0%, #F8A800 100%)',
        borderRadius: '24rpx',
        padding: '28rpx 32rpx',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 8rpx 24rpx rgba(245, 158, 11, 0.25)',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: '32rpx', fontWeight: 600 }}>会员中心</Text>
          <Text style={{ display: 'block', fontSize: '22rpx', color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>
            开通会员，享受多权益
          </Text>
        </View>
        <View style={{
          background: '#fff', color: 'var(--orange)',
          padding: '12rpx 28rpx', borderRadius: '999rpx',
          fontSize: '24rpx', fontWeight: 700,
        }}>立即开通</View>
      </View>

      {/* 菜单列表 */}
      <View style={{
        margin: '0 32rpx 24rpx', background: '#fff',
        borderRadius: '24rpx', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        {MENU.map((m, i) => (
          <View
            key={m.label}
            onClick={() => m.path && Taro.navigateTo({ url: m.path })}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '32rpx',
              borderBottom: i < MENU.length - 1 ? '1rpx solid var(--line)' : 'none',
            }}
          >
            <View style={{
              width: '56rpx', height: '56rpx', borderRadius: '16rpx',
              background: 'var(--brand-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: 20,
            }}>
              <Icon name={m.icon} size={32} color="var(--brand)" />
            </View>
            <Text style={{ flex: 1, fontSize: '28rpx', color: 'var(--ink-deep)' }}>{m.label}</Text>
            <Text style={{ fontSize: '32rpx', color: 'var(--ink-soft)' }}>›</Text>
          </View>
        ))}
      </View>

      {/* 注销账号 */}
      <View className="btn-ghost" style={{ margin: '0 32rpx 80rpx' }} onClick={onLogout}>
        注销账号
      </View>

      <Text style={{ display: 'block', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '22rpx', marginBottom: 24 }}>
        v1.0.0
      </Text>
    </ScrollView>
  );
}
