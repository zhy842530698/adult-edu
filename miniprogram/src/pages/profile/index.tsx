import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api, setToken } from '../../api/client';
import { getUser, logout } from '../../store/auth';
import { showError } from '../../utils/format';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(getUser());

  useEffect(() => {
    api.get<any>('/auth/me').then(setUser).catch(() => {});
  }, []);

  const onLogout = () => {
    Taro.showModal({
      title: '注销账号',
      content: '注销后将匿名化您的个人信息，且不可恢复。',
      confirmText: '确认注销',
      confirmColor: '#f5222d',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.post('/user/logout', {});
        } catch {}
        logout();
        Taro.reLaunch({ url: '/pages/login/index' });
      },
    });
  };

  const onFeedback = () => Taro.navigateTo({ url: '/pages/feedback/index' });

  return (
    <View className="container">
      <View className="card">
        <Text className="title">{user?.nickname || '未登录'}</Text>
        <Text className="muted" style={{ display: 'block' }}>openid: {user?.openid || '-'}</Text>
        {user?.agreed_privacy_version && (
          <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>
            协议版本：{user.agreed_privacy_version}
          </Text>
        )}
      </View>

      <View className="card">
        <View className="row-between" onClick={() => Taro.navigateTo({ url: '/pages/progress/index' })}>
          <Text>学习进度</Text><Text className="muted">→</Text>
        </View>
        <View className="row-between" style={{ marginTop: '16rpx' }}
          onClick={() => Taro.navigateTo({ url: '/pages/favorite/index' })}>
          <Text>我的收藏</Text><Text className="muted">→</Text>
        </View>
        <View className="row-between" style={{ marginTop: '16rpx' }} onClick={onFeedback}>
          <Text>意见反馈</Text><Text className="muted">→</Text>
        </View>
      </View>

      <View className="card">
        <Text className="muted">隐私政策 · 用户协议</Text>
        <Text className="tip" style={{ display: 'block', marginTop: '8rpx' }}>v1.0.0</Text>
      </View>

      <View className="btn-ghost" onClick={onLogout}>注销账号</View>
    </View>
  );
}