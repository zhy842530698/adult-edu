import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

export default function CatalogPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    api.get<any>('/exam-catalog').then((r) => setCats(r.items || []));
  }, []);

  const startPractice = async (mode: string, exam_id?: number, chapter_id?: number, knowledge_point_id?: number) => {
    try {
      const s = await api.post<any>('/practice-sessions', {
        mode, count: 10, exam_id, chapter_id, knowledge_point_id,
      });
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) { showError(e, '创建会话失败'); }
  };

  const filtered = keyword
    ? cats.flatMap((c) => c.exams || []).filter((e) => e.name.includes(keyword))
    : null;

  return (
    <ScrollView scrollY className="container">
      <View className="card">
        <View style={{ padding: '16rpx', borderRadius: '12rpx', background: '#f5f5f5' }}>
          <Text>🔍 搜索考试：{keyword || '输入关键词…'}</Text>
        </View>
      </View>

      {(filtered || cats).map((node: any, idx: number) => {
        const examList = filtered ? [node] : node.exams || [];
        return (
          <View key={idx} className="card">
            <Text className="title" style={{ fontSize: '30rpx' }}>{node.name || node.code || '分类'}</Text>
            {examList.map((e: any) => (
              <View key={e.id} style={{ borderTop: '2rpx solid #f0f0f0', padding: '16rpx 0' }}>
                <View className="row-between">
                  <Text style={{ fontWeight: 600 }}>{e.name}</Text>
                  <Text className="muted">{e.code}</Text>
                </View>
                <View className="row" style={{ marginTop: '12rpx' }}>
                  <View className="tag" onClick={() => startPractice('SEQUENTIAL', e.id)}>顺序</View>
                  <View className="tag green" onClick={() => startPractice('RANDOM', e.id)}>随机</View>
                  <View className="tag" onClick={() => startPractice('CHAPTER', e.id)}>章节</View>
                </View>
                {(e.subjects || []).map((s: any) => (
                  <View key={s.id} style={{ marginLeft: '16rpx', marginTop: '12rpx' }}>
                    <Text className="muted">└ {s.name}</Text>
                    <View style={{ marginLeft: '16rpx', marginTop: '6rpx' }}>
                      {(s.chapters || []).map((ch: any) => (
                        <View key={ch.id} className="row-between" style={{ padding: '6rpx 0' }}>
                          <Text style={{ fontSize: '26rpx' }}>{ch.name}</Text>
                          <Text className="muted" style={{ fontSize: '24rpx' }}
                            onClick={() => startPractice('CHAPTER', e.id, ch.id)}>专项→</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}