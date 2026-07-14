import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

/**
 * 学习计划页 —— 数据来源 /study-plan。
 * 后端补 study-plan 接口后启用；目前显示空态 + 引导文案。
 */

interface Phase { range: string; title: string; desc: string; done: boolean; }
interface SubjectProgress { name: string; progress: number; color: string; }

export default function StudyPlanPage() {
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectProgress[] | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planRange, setPlanRange] = useState<string | null>(null);
  const [tab, setTab] = useState<'phase' | 'subject'>('phase');

  useEffect(() => {
    api.get<any>('/study-plan')
      .then((r) => {
        setPlanName(r?.name || null);
        setPlanRange(r?.range || null);
        setPhases(Array.isArray(r?.phases) ? r.phases : []);
        setSubjects(Array.isArray(r?.subjects) ? r.subjects : []);
      })
      .catch(() => {
        setPhases(null);
        setSubjects(null);
      });
  }, []);

  const empty = phases == null && subjects == null && planName == null;

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '40rpx 32rpx 80rpx' }}>
      <View style={{ marginBottom: 24 }}>
        <View className="row-between">
          <Text style={{ fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>
            {planName || '学习计划'}
          </Text>
          <Text
            style={{ color: 'var(--brand)', fontSize: '26rpx', fontWeight: 500 }}
            onClick={() => Taro.showToast({ title: '编辑计划功能开发中', icon: 'none' })}
          >编辑</Text>
        </View>
        {planRange && (
          <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            {planRange}
          </Text>
        )}
      </View>

      {empty ? (
        <View style={{
          background: '#fff', borderRadius: '24rpx', padding: '80rpx 32rpx',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <View style={{ display: 'flex', justifyContent: 'center' }}>
            <Illustration kind="target" size={160} />
          </View>
          <Text style={{ display: 'block', marginTop: 24, fontSize: '28rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>
            暂未配置学习计划
          </Text>
          <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            设置目标考试后，将自动生成阶段计划
          </Text>
        </View>
      ) : (
        <>
          {/* 切换 */}
          <View style={{ display: 'flex', background: 'var(--bg-soft)', borderRadius: '999rpx', padding: 8, marginBottom: 24 }}>
            {[
              { v: 'phase',   l: '分阶段' },
              { v: 'subject', l: '分学科' },
            ].map((t) => (
              <View
                key={t.v}
                onClick={() => setTab(t.v as any)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12rpx 0',
                  borderRadius: '999rpx',
                  background: tab === t.v ? '#fff' : 'transparent',
                  color: tab === t.v ? 'var(--brand)' : 'var(--ink-mid)',
                  fontSize: '26rpx',
                  fontWeight: 600,
                  boxShadow: tab === t.v ? 'var(--shadow-sm)' : 'none',
                }}
              >{t.l}</View>
            ))}
          </View>

          {tab === 'phase' ? (
            phases && phases.length > 0 ? (
              phases.map((p, i) => (
                <View
                  key={i}
                  style={{
                    background: '#fff', borderRadius: '24rpx', padding: '28rpx 32rpx',
                    marginBottom: 16, boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <View className="row-between">
                    <View>
                      <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>{p.title}</Text>
                      <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>{p.range} · {p.desc}</Text>
                    </View>
                    <View className={p.done ? 'tag tag-mastered' : 'tag tag-doing'}>
                      {p.done ? '已完成' : '进行中'}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: 'var(--ink-mid)', padding: '40rpx 0' }}>暂无阶段数据</Text>
            )
          ) : (
            subjects && subjects.length > 0 ? (
              subjects.map((s, i) => (
                <View
                  key={i}
                  style={{
                    background: '#fff', borderRadius: '24rpx', padding: '28rpx 32rpx',
                    marginBottom: 16, boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <View className="row-between" style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{s.name}</Text>
                    <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>
                      <Text style={{ color: s.color, fontWeight: 700, fontSize: '32rpx' }}>{s.progress}</Text>%
                    </Text>
                  </View>
                  <View style={{
                    width: '100%', height: '12rpx', background: 'var(--bg-soft)',
                    borderRadius: '999rpx', overflow: 'hidden',
                  }}>
                    <View style={{ width: `${s.progress}%`, height: '100%', background: s.color, borderRadius: '999rpx' }} />
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: 'var(--ink-mid)', padding: '40rpx 0' }}>暂无学科数据</Text>
            )
          )}
        </>
      )}
    </View>
  );
}
