import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function FavoritePage() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    try {
      const r = await api.get<any>('/favorites');
      setItems(r.items || []);
    } catch (e) { showError(e, '加载失败'); }
  };
  useEffect(() => { load(); }, []);

  const onUnfav = async (qid: number) => {
    try {
      await api.delete(`/questions/${qid}/favorite`);
      load();
    } catch (e) { showError(e); }
  };

  return (
    <ScrollView scrollY className="container">
      <View className="card"><Text className="title">收藏题目</Text></View>
      {items.length === 0 && <View className="card"><Text className="muted">暂无收藏</Text></View>}
      {items.map((it) => (
        <View key={it.question_id} className="card row-between">
          <Text>题目 #{it.question_id}</Text>
          <Text onClick={() => onUnfav(it.question_id)} className="tag red">取消收藏</Text>
        </View>
      ))}
    </ScrollView>
  );
}