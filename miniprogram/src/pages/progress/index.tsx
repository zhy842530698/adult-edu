import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function ProgressPage() {
  const [summary, setSummary] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        api.get<any>('/progress/summary'),
        api.get<any>('/user/exam-targets'),
      ]);
      setSummary(a);
      setTargets(b.items || []);
    } catch (e) { showError(e); }
  };
  useEffect(() => { load(); }, []);

  return (
    <ScrollView scrollY className="container">
      <View className="card">
        <Text className="title">学习总览</Text>
        <View className="row" style={{ marginTop: '16rpx' }}>
          <View style={{ flex: 1 }}>
            <Text className="muted">总会话</Text>
            <Text style={{ display: 'block', fontWeight: 600 }}>{summary?.total_sessions || 0}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="muted">最近 7 天答题</Text>
            <Text style={{ display: 'block', fontWeight: 600 }}>{summary?.last7_answer_count || 0}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="muted">连续天数</Text>
            <Text style={{ display: 'block', fontWeight: 600 }}>{summary?.streak_days || 0}</Text>
          </View>
        </View>
      </View>

      <View className="card">
        <Text className="title">我的目标</Text>
        {targets.length === 0 && <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>未设置目标</Text>}
        {targets.map((t) => (
          <View key={t.id} className="row-between" style={{ marginTop: '12rpx' }}>
            <Text>{t.exam_name} {t.is_primary && <Text className="tag">主目标</Text>}</Text>
            <Text className="muted">每日 {t.daily_question_goal} 题</Text>
          </View>
        ))}
        <View className="btn-ghost" style={{ marginTop: '16rpx' }}
          onClick={() => Taro.navigateTo({ url: '/pages/onboarding/index' })}>
          修改目标
        </View>
      </View>

      <View className="card">
        <Text className="title">薄弱知识点</Text>
        <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>
          MVP 暂未聚合，后续版本按错误率排序。
        </Text>
      </View>
    </ScrollView>
  );
}