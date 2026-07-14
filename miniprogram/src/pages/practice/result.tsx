import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function ResultPage() {
  const id = Number(Taro.getCurrentInstance()?.router?.params?.id);
  const [sess, setSess] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.get<any>(`/practice-sessions/${id}/result`).then(setSess).catch((e) => showError(e, '加载失败'));
  }, [id]);

  if (!sess) return <View className="container"><Text>加载中…</Text></View>;

  const score = sess.awarded_score ?? sess.total_score ?? 0;
  const total = sess.total_score ?? 100;
  const correct = sess.correct_count ?? 0;
  const wrong = sess.wrong_count ?? 0;
  const accuracy = total > 0 ? Math.round((correct / Math.max(correct + wrong, 1)) * 100) : 0;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)' }}>
      <View style={{ padding: '32rpx', textAlign: 'center' }}>
        <Text style={{ fontSize: '32rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>
          {sess.paper_title || '本次练习'}
        </Text>
        <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8 }}>
          交卷时间：{sess.submitted_at ? new Date(sess.submitted_at).toLocaleString('zh-CN') : '—'}
        </Text>
      </View>

      <View style={{
        margin: '24rpx 32rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '40rpx 32rpx',
        textAlign: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '96rpx', fontWeight: 700, color: 'var(--brand)' }}>{score}</Text>
        <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}> / {total} 分</Text>

        <View style={{ marginTop: 32, display: 'flex', justifyContent: 'space-around' }}>
          <View style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '34rpx', fontWeight: 700, color: 'var(--green)' }}>
              {correct}
            </Text>
            <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 8 }}>答对</Text>
          </View>
          <View style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '34rpx', fontWeight: 700, color: 'var(--red)' }}>{wrong}</Text>
            <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 8 }}>答错</Text>
          </View>
          <View style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '34rpx', fontWeight: 700, color: 'var(--orange)' }}>{accuracy}%</Text>
            <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 8 }}>正确率</Text>
          </View>
        </View>
      </View>

      <View style={{
        margin: '24rpx 32rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '28rpx 32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="row-between" style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>答题卡</Text>
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <View style={{ display: 'inline-flex', alignItems: 'center', marginRight: 16 }}>
              <View style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--green)', marginRight: 6 }} />
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>正确</Text>
            </View>
            <View style={{ display: 'inline-flex', alignItems: 'center', marginRight: 16 }}>
              <View style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--red)', marginRight: 6 }} />
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>错误</Text>
            </View>
            <View style={{ display: 'inline-flex', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--bg-soft)', marginRight: 6 }} />
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>未答</Text>
            </View>
          </View>
        </View>
        <View className="answer-grid">
          {(sess.items || []).map((qq: any, i: number) => {
            const correct = qq.is_correct === true;
            const wrong = qq.is_correct === false;
            let cls = 'answer-cell';
            if (correct) cls += ' done';
            else if (wrong) cls += ' wrong';
            return (
              <View key={qq.question_version_id} className={cls}>{i + 1}</View>
            );
          })}
        </View>
      </View>

      <View className="btn-primary" style={{ margin: '24rpx 32rpx 0' }}
        onClick={() => Taro.navigateTo({ url: `/pages/practice/session?id=${id}` })}>
        查看解析
      </View>
      <View className="row-between" style={{ margin: '24rpx 32rpx 32rpx' }}>
        <View className="btn-ghost" style={{ flex: 1, marginRight: 12 }}
          onClick={() => Taro.navigateTo({ url: '/pages/wrong/index' })}>
          错题本
        </View>
        <View className="btn-ghost" style={{ flex: 1, marginLeft: 12 }}
          onClick={async () => {
            try {
              const s = await api.post<any>('/practice-sessions', { mode: 'MOCK', count: 20, exam_id: sess.exam_id });
              Taro.redirectTo({ url: `/pages/practice/session?id=${s.id}` });
            } catch (e) { showError(e, '创建失败'); }
          }}
        >
          再考一次
        </View>
      </View>
    </ScrollView>
  );
}
