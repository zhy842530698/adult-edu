import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { loginWithWechat } from '../../store/auth';
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
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (e) {
      showError(e, '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="container" style={{ paddingTop: '160rpx' }}>
      <View className="card" style={{ textAlign: 'center', padding: '64rpx 32rpx' }}>
        <Text style={{ fontSize: '44rpx', fontWeight: 700 }}>成人教育刷题</Text>
        <Text className="muted" style={{ display: 'block', marginTop: '12rpx' }}>
          顺序练习 · 模拟考试 · 错题复盘
        </Text>
      </View>

      <View className="card">
        <View className="row" onClick={() => setAgreed(!agreed)} style={{ marginBottom: '24rpx' }}>
          <View style={{
            width: '36rpx', height: '36rpx', borderRadius: '8rpx',
            border: '2rpx solid #1677ff', background: agreed ? '#1677ff' : '#fff',
            color: '#fff', textAlign: 'center', lineHeight: '32rpx', marginRight: '16rpx',
          }}>
            {agreed ? '✓' : ''}
          </View>
          <Text>我已阅读并同意 <Text style={{ color: '#1677ff' }}>《用户协议》</Text> 与 <Text style={{ color: '#1677ff' }}>《隐私政策》</Text></Text>
        </View>
        <View className="btn-primary" onClick={onLogin} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? '登录中…' : '微信一键登录'}
        </View>
      </View>
    </View>
  );
}
