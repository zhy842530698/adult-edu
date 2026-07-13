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
      Taro.showToast({ title: '已取消收藏', icon: 'success' });
      load();
    } catch (e) { showError(e); }
  };

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>我的收藏</Text>
      </View>

      <ScrollView scrollY style={{ padding: '0 32rpx 120rpx' }}>
        {items.length === 0 && (
          <View style={{
            marginTop: 120, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Text style={{ fontSize: '80rpx' }}>⭐</Text>
            <Text style={{ marginTop: 16, fontSize: '28rpx', color: 'var(--ink-deep)' }}>暂无收藏</Text>
            <Text style={{ marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
              在题目页面点击 ☆ 即可收藏
            </Text>
          </View>
        )}

        {items.map((it) => (
          <View key={it.question_id} className="card">
            <View className="row-between">
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>
                  题目 #{it.question_id}
                </Text>
                {it.stem && (
                  <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 6, lineHeight: 1.4 }} numberOfLines={2}>
                    {it.stem}
                  </Text>
                )}
              </View>
            </View>
            <View className="row-between" style={{ marginTop: 12 }}>
              <View className="tag tag-doing">已收藏</View>
              <Text
                onClick={() => onUnfav(it.question_id)}
                style={{ color: 'var(--red)', fontSize: '22rpx', fontWeight: 500 }}
              >取消收藏</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
