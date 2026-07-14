import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { loginWithWechat } from '../../store/auth';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const onLogin = async () => {
    if (!agreed) {
      Taro.showToast({ title: '请先同意《用户协议》《隐私政策》', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      await loginWithWechat();
      // 登录后先看 onboarding 状态
      const status = await api.get<any>('/user/onboarding-status').catch(() => null);
      if (status && !status.completed) {
        Taro.reLaunch({ url: '/pages/onboarding/index' });
      } else {
        Taro.switchTab({ url: '/pages/home/index' });
      }
    } catch (e) {
      showError(e, '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 60%, #EFF6FF 100%)',
      padding: '160rpx 32rpx 60rpx',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <View style={{
        width: '160rpx', height: '160rpx',
        background: '#fff',
        borderRadius: '32rpx',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '80rpx',
        boxShadow: '0 8rpx 24rpx rgba(0,0,0,0.15)',
      }}>📚</View>
      <Text style={{ marginTop: 32, color: '#fff', fontSize: '40rpx', fontWeight: 700 }}>刷题本</Text>
      <Text style={{ marginTop: 8, color: 'rgba(255,255,255,0.9)', fontSize: '26rpx' }}>
        顺序练习 · 模拟考试 · 错题复盘
      </Text>

      <View style={{
        width: '100%',
        marginTop: '120rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '40rpx 32rpx',
        boxShadow: '0 8rpx 24rpx rgba(0,0,0,0.10)',
      }}>
        <View className="row" onClick={() => setAgreed(!agreed)} style={{ marginBottom: '32rpx' }}>
          <View style={{
            width: '36rpx', height: '36rpx', borderRadius: '8rpx',
            border: `2rpx solid ${agreed ? 'var(--brand)' : 'var(--line)'}`,
            background: agreed ? 'var(--brand)' : '#fff',
            color: '#fff', textAlign: 'center', lineHeight: '32rpx', marginRight: '16rpx',
            fontSize: '22rpx',
          }}>
            {agreed ? '✓' : ''}
          </View>
          <Text style={{ flex: 1, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            我已阅读并同意
            <Text style={{ color: 'var(--brand)' }}>《用户协议》</Text>
            与
            <Text style={{ color: 'var(--brand)' }}>《隐私政策》</Text>
          </Text>
        </View>
        <View
          className="btn-primary"
          onClick={onLogin}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '登录中…' : '微信一键登录'}
        </View>
      </View>
    </View>
  );
}
