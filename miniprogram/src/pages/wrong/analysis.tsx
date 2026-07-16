import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api, getToken } from '../../api/client';
import { showError } from '../../utils/format';

/**
 * 错题解析 —— 原型"错题解析"截图
 * Tabs: 题目 / 解析 / 相关知识点
 * 内容：你的答案 vs 正确答案 + 解析 + 知识点列表
 *
 * 数据源：尝试从 session 拿单题，session_id+qvid 通过 url 参数传入
 *        若解析失败则只展示路由参数 + 兜底视图
 */

export default function AnalysisPage() {
  const router = Taro.getCurrentInstance()?.router;
  const sessId = Number(router?.params?.sess || 0);
  const qvid = Number(router?.params?.qvid || 0);

  const [tab, setTab] = useState<'q' | 'a' | 'k'>('q');
  const [sess, setSess] = useState<any>(null);

  useEffect(() => {
    if (!sessId) return;
    if (!getToken()) return;
    api.get<any>(`/practice-sessions/${sessId}`).then(setSess).catch((e) => showError(e, '加载失败'));
  }, [sessId]);

  const q = sess?.items?.find((x: any) => x.question_version_id === qvid);

  const TABS: Array<{ k: 'q' | 'a' | 'k'; l: string }> = [
    { k: 'q', l: '题目' },
    { k: 'a', l: '解析' },
    { k: 'k', l: '相关知识点' },
  ];

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '32rpx 32rpx 0' }}>
        <Text style={{ fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>错题解析</Text>
      </View>

      {/* Tabs */}
      <View style={{ display: 'flex', padding: '0 32rpx', marginTop: 24 }}>
        {TABS.map((t) => (
          <View
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              flex: 1, textAlign: 'center', padding: '20rpx 0',
              borderBottom: tab === t.k ? '4rpx solid var(--brand)' : '4rpx solid transparent',
            }}
          >
            <Text style={{
              fontSize: '28rpx',
              fontWeight: 600,
              color: tab === t.k ? 'var(--brand)' : 'var(--ink-mid)',
            }}>{t.l}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY style={{ padding: '24rpx 32rpx 80rpx' }}>
        {tab === 'q' && (
          <View className="card">
            {q ? (
              <>
                <View className="row" style={{ marginBottom: 16 }}>
                  <View className="tag tag-doing">{q.question_type === 'SINGLE_CHOICE' ? '单选' : '多选'}</View>
                  <View className="tag tag-gray">{q.score} 分</View>
                </View>
                <Text style={{ fontSize: '28rpx', color: 'var(--ink-deep)', lineHeight: 1.6 }}>{q.stem}</Text>
                <View style={{ marginTop: 24 }}>
                  {(q.options || []).map((o: any) => (
                    <View key={o.option_code} className="option" style={{ display: 'flex' }}>
                      <Text style={{ fontWeight: 700, marginRight: 12 }}>{o.option_code}.</Text>
                      <Text>{o.content}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={{ color: 'var(--ink-mid)' }}>题目加载中…</Text>
            )}
          </View>
        )}

        {tab === 'a' && (
          <>
            <View style={{
              background: 'var(--green-soft)',
              borderRadius: '16rpx',
              padding: '20rpx 24rpx',
              marginBottom: 16,
            }}>
              <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)' }}>正确答案</Text>
              <Text style={{ display: 'block', marginTop: 6, fontSize: '32rpx', fontWeight: 700, color: 'var(--green)' }}>
                {(q?.correct_options || []).join(', ') || '—'}
              </Text>
            </View>
            <View style={{
              background: 'var(--red-soft)',
              borderRadius: '16rpx',
              padding: '20rpx 24rpx',
              marginBottom: 16,
            }}>
              <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)' }}>你的答案</Text>
              <Text style={{ display: 'block', marginTop: 6, fontSize: '32rpx', fontWeight: 700, color: 'var(--red)' }}>
                {(q?.selected_options || []).join(', ') || '—'}
              </Text>
            </View>
            <View className="card">
              <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)', display: 'block' }}>解析</Text>
              <Text style={{ display: 'block', marginTop: 12, fontSize: '28rpx', color: 'var(--ink-deep)', lineHeight: 1.6 }}>
                {q?.analysis || '暂无解析'}
              </Text>
            </View>
          </>
        )}

        {tab === 'k' && (
          <View className="card">
            <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)', display: 'block', marginBottom: 16 }}>
              相关知识点
            </Text>
            {Array.isArray(q?.knowledge_points) && q.knowledge_points.length > 0 ? (
              q.knowledge_points.map((k: any, i: number) => (
                <View key={i} style={{
                  background: 'var(--bg-soft)',
                  padding: '24rpx',
                  borderRadius: '16rpx',
                  marginBottom: 12,
                }}>
                  <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>
                    {k.name || k.n}
                  </Text>
                  {(k.desc || k.description) && (
                    <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {k.desc || k.description}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={{ color: 'var(--ink-mid)', fontSize: '24rpx' }}>暂无相关知识点</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* 底部双按钮 */}
      <View className="row-between" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '24rpx 32rpx',
        background: '#fff',
        boxShadow: '0 -2rpx 16rpx rgba(0,0,0,0.06)',
      }}>
        <View
          style={{
            flex: 1, marginRight: 12,
            background: 'var(--brand-soft)', color: 'var(--brand)',
            borderRadius: '16rpx', padding: '24rpx', textAlign: 'center',
            fontSize: '28rpx', fontWeight: 600,
          }}
          onClick={async () => {
            if (!q?.question_id) {
              Taro.showToast({ title: '缺少题目上下文', icon: 'none' });
              return;
            }
            try {
              await api.post(`/wrong-questions/${q.question_id}/remove`, {});
              Taro.showToast({ title: '已掌握', icon: 'success' });
            } catch (e) {
              Taro.showToast({ title: '操作失败', icon: 'none' });
            }
          }}
        >
          ⭐ 标记掌握
        </View>
        <View
          className="btn-primary"
          style={{ flex: 1, marginLeft: 12 }}
          onClick={() => Taro.navigateBack()}
        >
          再练一题
        </View>
      </View>
    </View>
  );
}
