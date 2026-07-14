import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import ProgressBar from '../../components/ProgressBar';
import Illustration from '../../components/Illustration';

/**
 * 学习报告 —— 数据来源 /progress/summary（KPI、连续打卡）
 *             /progress/weekly  （周趋势，后端就绪后启用）
 * 周趋势图与目标达成都改为占位，等对应接口就绪后再启用。
 */

export default function ReportPage() {
  const [summary, setSummary] = useState<any>(null);
  const [weekly, setWeekly] = useState<number[] | null>(null);

  useEffect(() => {
    api.get<any>('/progress/summary').then(setSummary).catch((e) => showError(e));
    api.get<any>('/progress/weekly')
      .then((r) => setWeekly(Array.isArray(r?.counts) ? r.counts : null))
      .catch(() => setWeekly(null));
  }, []);

  const sessions = summary?.total_sessions ?? null;
  const accuracy = summary?.accuracy ?? null;
  const streak = summary?.streak_days ?? null;
  const studyMin = summary?.study_minutes ?? null;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>学习报告</Text>
        <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          {new Date().getFullYear()} 年 {new Date().getMonth() + 1} 月
        </Text>
      </View>

      {/* KPI 卡 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '40rpx 32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View style={{ display: 'flex' }}>
          {[
            { v: sessions != null ? `${sessions}` : '—',          l: '总会话', color: 'var(--red)' },
            { v: accuracy != null ? `${accuracy}%` : '—',          l: '正确率', color: 'var(--green)' },
            { v: studyMin != null ? `${studyMin}` : '—',           l: '学习时长(分)', color: 'var(--brand)' },
            { v: streak != null ? `${streak}` : '—',               l: '连续天数', color: 'var(--orange)' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center' }}>
              <Text style={{ fontSize: '52rpx', fontWeight: 700, color: s.color }}>{s.v}</Text>
              <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8 }}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 周趋势：有 weekly 数据时渲染，否则空态 */}
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
        {Array.isArray(weekly) && weekly.length > 0 ? (
          <>
            <View style={{ display: 'flex', alignItems: 'flex-end', height: '180rpx', marginBottom: 16 }}>
              {(() => {
                const max = Math.max(...weekly, 1);
                return weekly.map((h, i) => (
                  <View key={i} style={{ flex: 1, textAlign: 'center', height: `${Math.round((h / max) * 100)}%`, marginLeft: i > 0 ? 4 : 0, marginRight: 4 }}>
                    <View style={{
                      height: '100%', background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-deep) 100%)',
                      borderRadius: '12rpx',
                    }} />
                  </View>
                ));
              })()}
            </View>
            <View style={{ display: 'flex' }}>
              {['一','二','三','四','五','六','日'].map((d, i) => (
                <View key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>{d}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)', textAlign: 'center', padding: '40rpx 0' }}>
            暂无周报数据
          </Text>
        )}
      </View>

      {/* 目标达成：等后端 goal 接口就绪后启用 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block', marginBottom: 12 }}>
          目标达成
        </Text>
        <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)', textAlign: 'center', padding: '24rpx 0' }}>
          {summary?.weekly_goal ? `${summary.weekly_goal.done} / ${summary.weekly_goal.target} 题` : '暂未设置目标'}
        </Text>
        {summary?.weekly_goal && (
          <ProgressBar percent={Math.min(100, Math.round((summary.weekly_goal.done / Math.max(summary.weekly_goal.target, 1)) * 100))} />
        )}
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
