import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import Icon from '../../components/Icon';

/**
 * 练习 Tab 聚合页
 * - 顶部：今日任务（来自 /practice-sessions/daily-task 与 /user/daily-target）
 * - 中间：二级入口（每日一练 / 错题本 / 我的笔记 / 打卡日历）
 */

interface Todo { text: string; done: boolean; }

const ENTRIES = [
  { key: 'daily',  label: '每日一练', desc: '每天 10 题，坚持进步', icon: 'calendar' as const, color: '#2563EB', bg: 'var(--brand-soft)' },
  { key: 'wrong',  label: '错题本',   desc: '回顾错题，避免再错',   icon: 'wrong'    as const, color: '#EF4444', bg: '#FEF2F2' },
  { key: 'notes',  label: '我的笔记', desc: '随手记录重点',         icon: 'notes'    as const, color: '#F8A800', bg: 'var(--orange-soft)' },
  { key: 'checkin',label: '打卡日历', desc: '每天打卡，看得见的坚持', icon: 'trophy'  as const, color: '#10B881', bg: 'var(--green-soft)' },
];

const PATHS: Record<string, string> = {
  daily:   '/pages/study/daily',
  wrong:   '/pages/wrong/index',
  notes:   '/pages/learn/notes',
  checkin: '/pages/study/checkin',
};

export default function PracticeIndexPage() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    api.get<any>('/practice-sessions/daily-task')
      .then((dt) => {
        if (dt?.has_task) {
          setTodos([
            { text: `每日一练 ${dt.count} 题`, done: !!dt.completed },
          ]);
        } else {
          setTodos([]);
        }
      })
      .catch(() => setTodos([]));
  }, []);

  const finished = todos.filter((t) => t.done).length;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 16rpx' }}>
        <Text style={{ fontSize: '32rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>练习</Text>
      </View>

      {/* 今日任务 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="row-between" style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>今日任务</Text>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>已完成 {finished}/{todos.length}</Text>
        </View>
        {todos.length === 0 ? (
          <Text style={{ fontSize: '26rpx', color: 'var(--ink-mid)' }}>今日暂无任务</Text>
        ) : (
          todos.map((t, i) => (
            <View key={i} className="row" style={{ marginBottom: 16 }}>
              <View style={{
                width: '36rpx', height: '36rpx', borderRadius: '999rpx',
                border: t.done ? '2rpx solid var(--brand)' : '2rpx solid var(--line)',
                background: t.done ? 'var(--brand)' : '#fff',
                color: '#fff', textAlign: 'center', lineHeight: '32rpx',
                fontSize: '22rpx', marginRight: 16,
                flexShrink: 0,
              }}>
                {t.done ? '✓' : ''}
              </View>
              <Text style={{
                fontSize: '28rpx',
                color: t.done ? 'var(--ink-mid)' : 'var(--ink-deep)',
                textDecoration: t.done ? 'line-through' : 'none',
              }}>{t.text}</Text>
            </View>
          ))
        )}
      </View>

      {/* 二级入口 */}
      <View style={{
        margin: '0 32rpx 80rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '0 32rpx',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        {ENTRIES.map((e, i) => (
          <View
            key={e.key}
            onClick={() => Taro.navigateTo({ url: PATHS[e.key] })}
            className="row"
            style={{
              padding: '32rpx 0',
              borderBottom: i < ENTRIES.length - 1 ? '1rpx solid var(--line)' : 'none',
            }}
          >
            <View style={{
              width: '72rpx', height: '72rpx',
              borderRadius: '20rpx',
              background: e.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: 24,
            }}>
              <Icon name={e.icon} size={40} color={e.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{e.label}</Text>
              <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>{e.desc}</Text>
            </View>
            <Text style={{ fontSize: '40rpx', color: 'var(--ink-soft)' }}>›</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
