import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import { api } from '../../api/client';
import { getTargets } from '../../store/auth';
import { showError } from '../../utils/format';

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [dailyTask, setDailyTask] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);

  const load = async () => {
    try {
      const [t, dt] = await Promise.all([
        api.get<any>('/user/exam-targets'),
        api.get<any>('/practice-sessions/daily-task').catch(() => null),
      ]);
      setTargets(t.items || []);
      setDailyTask(dt);
    } catch (e) { showError(e, '加载失败'); }
    try {
      const r = await api.get<any>('/progress/summary');
      setProgress(r);
    } catch {}
  };

  useEffect(() => {
    setTargets(getTargets() || []);
  }, []);

  // Tab pages are cached by WeChat; useEffect does not run again after onboarding.
  // Refresh whenever the home tab becomes visible so a newly saved target appears.
  useDidShow(() => { load(); });

  const startDaily = async () => {
    if (!dailyTask?.has_task) { Taro.showToast({ title: '今日暂无每日一练', icon: 'none' }); return; }
    await goSession({ mode: 'DAILY', count: dailyTask.count, exam_id: dailyTask.exam_id });
  };

  const goSession = async (body: any) => {
    try {
      const s = await api.post<any>('/practice-sessions', body);
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) {
      showError(e, '创建会话失败');
    }
  };

  const primary = targets.find((t) => t.is_primary) || targets[0];

  return (
    <ScrollView scrollY className="container">
      <View className="card">
        <Text className="muted">主目标考试</Text>
        <Text className="title" style={{ display: 'block', marginTop: '8rpx' }}>
          {primary?.exam_name || '暂未设置'}
        </Text>
        {primary && (
          <View className="row" style={{ marginTop: '16rpx' }}>
            <View className="tag" onClick={() => goSession({ mode: 'SEQUENTIAL', count: 10, exam_id: primary.exam_id })}>
              顺序练习
            </View>
            <View className="tag green" onClick={() => goSession({ mode: 'RANDOM', count: 10, exam_id: primary.exam_id })}>
              随机练习
            </View>
            <View className="tag" onClick={() => goSession({ mode: 'MOCK', count: 20, exam_id: primary.exam_id })}>
              模拟考试
            </View>
          </View>
        )}
      </View>

      <View className="card" onClick={startDaily}>
        <Text className="title" style={{ fontSize: '30rpx' }}>每日一练</Text>
        <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>
          {dailyTask?.has_task ? `今日 ${dailyTask.count} 题，点击开始` : '今日暂无每日一练'}
        </Text>
      </View>

      {progress && (
        <View className="card">
          <Text className="title" style={{ fontSize: '30rpx' }}>最近 7 天</Text>
          <View className="row" style={{ marginTop: '12rpx' }}>
            <View style={{ flex: 1 }}>
              <Text className="muted">会话数</Text>
              <Text style={{ display: 'block', fontWeight: 600 }}>{progress.total_sessions}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="muted">答题数</Text>
              <Text style={{ display: 'block', fontWeight: 600 }}>{progress.last7_answer_count}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="muted">连续天数</Text>
              <Text style={{ display: 'block', fontWeight: 600 }}>{progress.streak_days || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {!primary && (
        <View className="btn-primary" onClick={() => Taro.navigateTo({ url: '/pages/onboarding/index' })}>
          设置目标考试
        </View>
      )}
    </ScrollView>
  );
}
