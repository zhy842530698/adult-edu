import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function ResultPage() {
  const id = Number(Taro.getCurrentInstance()?.router?.params?.id);
  const [sess, setSess] = useState<any>(null);

  useEffect(() => {
    api.get<any>(`/practice-sessions/${id}/result`).then(setSess).catch((e) => showError(e));
  }, [id]);

  if (!sess) return <View className="container"><Text>加载中…</Text></View>;

  const accuracy = sess.total_questions
    ? Math.round((sess.correct_count / sess.total_questions) * 100)
    : 0;

  return (
    <ScrollView scrollY className="container">
      <View className="card" style={{ textAlign: 'center' }}>
        <Text className="muted">本次成绩</Text>
        <Text style={{ display: 'block', fontSize: '72rpx', fontWeight: 700, color: '#1677ff' }}>
          {sess.score || 0}
        </Text>
        <Text className="muted">分 · 正确率 {accuracy}%</Text>
      </View>

      <View className="card">
        <View className="row-between"><Text>总题数</Text><Text>{sess.total_questions}</Text></View>
        <View className="row-between"><Text>答对</Text><Text style={{ color: '#52c41a' }}>{sess.correct_count}</Text></View>
        <View className="row-between"><Text>答错</Text><Text style={{ color: '#f5222d' }}>{sess.wrong_count}</Text></View>
        <View className="row-between"><Text>未答</Text><Text>{sess.unanswered_count || 0}</Text></View>
        <View className="row-between"><Text>用时</Text><Text>{sess.duration_seconds || 0} 秒</Text></View>
      </View>

      <View className="card">
        <Text className="title" style={{ fontSize: '30rpx' }}>逐题回顾</Text>
        {(sess.questions || []).map((q: any, i: number) => (
          <View key={q.question_version_id} style={{ borderTop: '2rpx solid #f0f0f0', padding: '16rpx 0' }}>
            <View className="row-between">
              <Text style={{ fontWeight: 600 }}>{i + 1}. {(q.user_answer || []).join('') || '未答'}</Text>
              <Text className={q.is_correct ? 'tag green' : 'tag red'}>{q.is_correct ? '✓ 正确' : '✗ 错误'}</Text>
            </View>
            <Text className="muted" style={{ display: 'block', marginTop: '4rpx' }}>
              正确答案：{(q.correct_options || []).join('')}
            </Text>
            {q.analysis && <Text style={{ display: 'block', marginTop: '8rpx' }}>{q.analysis}</Text>}
          </View>
        ))}
      </View>

      <View className="btn-primary" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>返回首页</View>
      <View className="btn-ghost" style={{ marginTop: '12rpx' }}
        onClick={() => Taro.switchTab({ url: '/pages/wrong/index' })}>查看错题</View>
    </ScrollView>
  );
}