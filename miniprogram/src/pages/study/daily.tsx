import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

/**
 * 每日一练 —— 原型"每日一练"截图
 * 顶部日历插画 + 三列数据 + "继续练习" + "查看全部解析"
 */

export default function DailyPage() {
  const [today, setToday] = useState(new Date());
  const [dailyTask, setDailyTask] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/practice-sessions/daily-task').then(setDailyTask).catch(() => {});
  }, []);

  const goStart = async () => {
    try {
      const body: any = { mode: 'DAILY', count: dailyTask?.count || 10 };
      if (dailyTask?.exam_id) body.exam_id = dailyTask.exam_id;
      const s = await api.post<any>('/practice-sessions', body);
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) { showError(e, '创建失败'); }
  };

  const weekDay = `星期${'日一二三四五六'[today.getDay()]}`;
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <View className="row-between">
          <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>每日一练</Text>
          <Text style={{ color: 'var(--brand)', fontSize: '26rpx', fontWeight: 500 }}>📅 日历</Text>
        </View>
      </View>

      {/* 大插画 + slogan */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
        borderRadius: '24rpx',
        padding: '40rpx 32rpx',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ color: 'var(--brand)', fontSize: '28rpx', fontWeight: 600 }}>
          {dateLabel} {weekDay}
        </Text>
        <View style={{ marginTop: 24 }}>
          <Illustration kind="calendar" size={240} />
        </View>
        <Text style={{ marginTop: 16, fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>
          每日进步一点点
        </Text>
        <Text style={{ marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          坚持练习，稳定进步
        </Text>
      </View>

      {/* 数据三列 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx 0',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
      }}>
        {[
          { v: dailyTask?.count || 10, l: '今日题目' },
          { v: 7,                     l: '已完成'   },
          { v: '85%',                 l: '正确率'   },
        ].map((s, i) => (
          <View key={i} style={{ flex: 1, textAlign: 'center' }}>
            <Text style={{ fontSize: '48rpx', fontWeight: 700, color: 'var(--brand)' }}>{s.v}</Text>
            <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8 }}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* 主按钮 */}
      <View className="btn-primary" style={{ margin: '0 32rpx 16rpx' }} onClick={goStart}>
        继续练习
      </View>
      <View className="btn-text" style={{ margin: '0 32rpx 80rpx' }}
        onClick={() => Taro.navigateTo({ url: '/pages/wrong/index' })}>
        查看全部解析 ›
      </View>
    </ScrollView>
  );
}
