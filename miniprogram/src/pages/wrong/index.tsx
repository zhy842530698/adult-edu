import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { fmtDate, showError } from '../../utils/format';

export default function WrongPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    try {
      const r = await api.get<any>('/wrong-questions');
      setItems(r.items || []);
    } catch (e) { showError(e, '加载失败'); }
  };
  useEffect(() => { load(); }, []);

  const onPractice = async () => {
    try {
      const r = await api.post<any>('/wrong-questions/practice', { count: 10 });
      Taro.navigateTo({ url: `/pages/practice/session?id=${r.session_id}` });
    } catch (e) { showError(e, '开始错题练习失败'); }
  };

  return (
    <ScrollView scrollY className="container">
      <View className="card row-between">
        <Text className="title">错题本</Text>
        <View className="btn-primary" onClick={onPractice} style={{ padding: '8rpx 24rpx', fontSize: '26rpx' }}>
          再次练习
        </View>
      </View>

      {items.length === 0 && (
        <View className="card"><Text className="muted">暂无错题，做几道题试试～</Text></View>
      )}

      {items.map((w) => (
        <View key={w.question_id} className="card">
          <View className="row-between">
            <Text style={{ fontWeight: 600 }}>题目 #{w.question_id}</Text>
            <Text className={w.mastered ? 'tag green' : 'tag red'}>{w.mastered ? '已掌握' : `错 ${w.wrong_count}`}</Text>
          </View>
          <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>
            最近错误：{fmtDate(w.last_wrong_at)}
          </Text>
          {w.next_review_at && (
            <Text className="muted" style={{ display: 'block' }}>
              下次复习：{fmtDate(w.next_review_at)}
            </Text>
          )}
          <Text className="muted">连续答对：{w.consecutive_correct}</Text>
        </View>
      ))}
    </ScrollView>
  );
}