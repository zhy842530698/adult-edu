import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import ProgressBar from '../../components/ProgressBar';
import Illustration from '../../components/Illustration';

/**
 * 学习报告（mock + 真 progress/summary）
 * 顶部：3 大卡（错题 / 正确率 / 学习时长）
 * 中间：本周进度条
 * 底部：错因分布占位
 */

export default function ReportPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/progress/summary').then(setSummary).catch((e) => showError(e));
  }, []);

  const sessions = summary?.total_sessions || 0;
  const last7 = summary?.last7_answer_count || 0;
  const streak = summary?.streak_days || 23;
  const wrong = last7 ? Math.round(last7 * 0.2) : 24;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>学习报告</Text>
        <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          {new Date().getFullYear()} 年 {new Date().getMonth() + 1} 月
        </Text>
      </View>

      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '40rpx 32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View style={{ display: 'flex' }}>
          {[
            { v: wrong, l: '错题数',  color: 'var(--red)' },
            { v: '78%', l: '正确率',  color: 'var(--green)' },
            { v: '65',  l: '学习时长 (分)', color: 'var(--brand)' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center' }}>
              <Text style={{ fontSize: '52rpx', fontWeight: 700, color: s.color }}>{s.v}</Text>
              <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8 }}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 周趋势占位 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block', marginBottom: 24 }}>
          本周进度
        </Text>
        <View style={{ display: 'flex', alignItems: 'flex-end', height: '180rpx', marginBottom: 16 }}>
          {[40, 65, 50, 80, 70, 90, 55].map((h, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center', height: `${h}%`, marginLeft: i > 0 ? 4 : 0, marginRight: 4 }}>
              <View style={{
                height: '100%', background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-deep) 100%)',
                borderRadius: '12rpx',
              }} />
            </View>
          ))}
        </View>
        <View style={{ display: 'flex' }}>
          {['一','二','三','四','五','六','日'].map((d, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center' }}>
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>{d}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>目标达成</Text>
        <View className="row-between" style={{ marginTop: 24, marginBottom: 12 }}>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>做题量</Text>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>320 / 500 题</Text>
        </View>
        <ProgressBar percent={64} color="linear-gradient(90deg, var(--orange) 0%, #FB923C 100%)" />
        <View style={{ height: 24 }} />
        <View className="row-between" style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>每日学习</Text>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>6.5 / 10 小时</Text>
        </View>
        <ProgressBar percent={65} />
      </View>

      <View style={{ margin: '0 32rpx 80rpx', textAlign: 'center' }}>
        <View style={{ display: 'flex', justifyContent: 'center' }}>
          <Illustration kind="trophy" size={140} />
        </View>
        <Text style={{ display: 'block', marginTop: 16, color: 'var(--ink-mid)', fontSize: '24rpx' }}>
          坚持每一天，看得见的进步
        </Text>
      </View>
    </ScrollView>
  );
}
