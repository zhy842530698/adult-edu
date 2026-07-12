import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function MockListPage() {
  const [papers, setPapers] = useState<any[]>([]);

  useEffect(() => {
    // Backend doesn't expose /papers to C-side yet (admin only). For MVP, surface daily-task + exam->random as "模拟卷"。
    // 这里复用 daily-task 作为快捷入口，避免对外暴露内部管理接口。
    api.get<any>('/practice-sessions/daily-task').catch(() => null);
    setPapers([
      { id: 'daily', title: '每日一练', is_published: true, paper_type: 'DAILY' },
    ]);
  }, []);

  const onStart = async (kind: string) => {
    try {
      const s = await api.post<any>('/practice-sessions', { mode: kind, count: 20 });
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) { showError(e, '创建失败'); }
  };

  return (
    <ScrollView scrollY className="container">
      <View className="card">
        <Text className="title">模拟试卷</Text>
        <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>
          模拟试卷交卷前不会显示答案与解析。
        </Text>
      </View>
      <View className="card" onClick={() => onStart('MOCK')}>
        <Text className="title" style={{ fontSize: '30rpx' }}>快速模拟（20 题）</Text>
        <Text className="muted">从已发布题目中随机抽取</Text>
      </View>
      <View className="card" onClick={() => onStart('DAILY')}>
        <Text className="title" style={{ fontSize: '30rpx' }}>每日一练</Text>
        <Text className="muted">由运营配置的固定题组</Text>
      </View>
    </ScrollView>
  );
}