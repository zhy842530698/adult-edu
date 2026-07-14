import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

/**
 * 模拟试卷列表 —— 数据来源 /papers（C 端） 或 /practice-sessions/daily-task。
 * 后端补 C 端 papers 接口后启用；目前显示空态 + 快捷入口。
 */

export default function MockListPage() {
  const [papers, setPapers] = useState<any[] | null>(null);

  useEffect(() => {
    api.get<any>('/papers')
      .then((r) => setPapers(Array.isArray(r?.items) ? r.items : []))
      .catch(() => setPapers(null));
  }, []);

  const onStart = async (kind: 'MOCK' | 'DAILY') => {
    try {
      const s = await api.post<any>('/practice-sessions', { mode: kind, count: 20 });
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) { showError(e, '创建失败'); }
  };

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>模拟试卷</Text>
        <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          交卷前不会显示答案与解析
        </Text>
      </View>

      {papers == null ? (
        <View style={{
          margin: '32rpx', background: '#fff', borderRadius: '24rpx', padding: '80rpx 32rpx',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <View style={{ display: 'flex', justifyContent: 'center' }}>
            <Illustration kind="cloud" size={160} />
          </View>
          <Text style={{ display: 'block', marginTop: 24, fontSize: '28rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>
            模拟试卷功能开发中
          </Text>
          <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            上线后可按试卷组织练习
          </Text>
        </View>
      ) : papers.length === 0 ? (
        <View style={{
          margin: '32rpx', background: '#fff', borderRadius: '24rpx', padding: '80rpx 32rpx',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <View style={{ display: 'flex', justifyContent: 'center' }}>
            <Illustration kind="cloud" size={160} />
          </View>
          <Text style={{ display: 'block', marginTop: 24, fontSize: '28rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>
            暂无模拟试卷
          </Text>
          <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            运营发布试卷后会显示在这里
          </Text>
        </View>
      ) : (
        <View style={{ margin: '0 32rpx' }}>
          {papers.map((p) => (
            <View key={p.id} className="card" style={{ marginBottom: 12 }}
              onClick={() => onStart('MOCK')}>
              <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{p.title || '未命名试卷'}</Text>
              {p.paper_type && (
                <Text style={{ display: 'block', marginTop: 6, fontSize: '22rpx', color: 'var(--ink-mid)' }}>
                  类型：{p.paper_type}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ margin: '24rpx 32rpx' }}>
        <View className="btn-primary" onClick={() => onStart('MOCK')}>快速模拟（20 题）</View>
        <View style={{ height: 12 }} />
        <View className="btn-ghost" onClick={() => onStart('DAILY')}>每日一练</View>
      </View>
    </ScrollView>
  );
}
