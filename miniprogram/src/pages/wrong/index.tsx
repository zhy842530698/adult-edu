import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { fmtDate, showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

export default function WrongPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('全部');
  const [edit, setEdit] = useState(false);
  const [examNames, setExamNames] = useState<string[]>([]);

  const load = async () => {
    try {
      const r = await api.get<any>('/wrong-questions');
      setItems(r.items || []);
    } catch (e) { showError(e, '加载失败'); }
  };

  useEffect(() => {
    load();
    api.get<any>('/exam-catalog')
      .then((r) => {
        const names: string[] = [];
        (r.items || []).forEach((c: any) => {
          (c.exams || []).forEach((e: any) => { if (e.name) names.push(e.name); });
        });
        setExamNames(names);
      })
      .catch(() => setExamNames([]));
  }, []);

  // filter chip：'全部' + 后端返回的所有 exam name
  const SUBJECTS = useMemo(() => ['全部', ...examNames], [examNames]);

  // 根据 filter 实际过滤 items（之前的版本仅切 UI 不真过滤）
  const filteredItems = useMemo(() => {
    if (filter === '全部') return items;
    return items.filter((w) => w.exam_name === filter || w.subject_name === filter);
  }, [items, filter]);

  const onPractice = async () => {
    try {
      const r = await api.post<any>('/wrong-questions/practice', { count: 10 });
      Taro.navigateTo({ url: `/pages/practice/session?id=${r.session_id}` });
    } catch (e) { showError(e, '开始错题练习失败'); }
  };

  const onRemove = async (questionId: number) => {
    try {
      await api.post(`/wrong-questions/${questionId}/remove`, {});
      Taro.showToast({ title: '已移除', icon: 'success' });
      load();
    } catch (e) { showError(e, '移除失败'); }
  };

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '32rpx 32rpx 16rpx' }}>
        <View className="row-between">
          <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>错题本</Text>
          <Text onClick={() => setEdit(!edit)} style={{ color: 'var(--brand)', fontSize: '26rpx' }}>
            {edit ? '完成' : '编辑'}
          </Text>
        </View>
      </View>

      {/* 筛选标签 */}
      <ScrollView scrollX style={{ whiteSpace: 'nowrap', padding: '0 32rpx', height: '64rpx' }} showScrollbar={false}>
        {SUBJECTS.map((t) => (
          <View
            key={t}
            onClick={() => setFilter(t)}
            style={{
              display: 'inline-block',
              padding: '12rpx 32rpx',
              marginRight: 16,
              borderRadius: '999rpx',
              background: filter === t ? 'var(--brand)' : 'var(--brand-soft)',
              color: filter === t ? '#fff' : 'var(--brand)',
              fontSize: '26rpx',
              fontWeight: 500,
            }}
          >{t}</View>
        ))}
      </ScrollView>

      {/* 错题练习入口（之前缺失 UI 入口）*/}
      {items.length > 0 && (
        <View style={{ padding: '24rpx 32rpx 0' }}>
          <View
            className="btn-primary"
            style={{ width: '100%', textAlign: 'center' }}
            onClick={onPractice}
          >
            开始错题练习（{Math.min(items.length, 10)} 题）
          </View>
        </View>
      )}

      <ScrollView scrollY style={{ padding: '24rpx 32rpx 120rpx' }}>
        {filteredItems.length === 0 && (
          <View className="card" style={{ textAlign: 'center', padding: '80rpx 32rpx' }}>
            <View style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <Illustration kind="cloud" size={160} />
            </View>
            <Text style={{ fontSize: '28rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>暂无错题</Text>
            <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8 }}>
              {filter === '全部' ? '开始练习，错题会自动收录到这里' : `「${filter}」下暂无错题`}
            </Text>
          </View>
        )}

        {filteredItems.map((w) => {
          const date = w.last_wrong_at ? new Date(w.last_wrong_at).toISOString().slice(0, 10).replace(/-/g, '.') : '';
          return (
            <View
              key={w.question_id}
              className="card"
              onClick={() => !edit && Taro.navigateTo({ url: `/pages/wrong/analysis?qvid=${w.question_version_id || w.question_id}` })}
            >
              <View className="row-between">
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>
                    题目 #{w.question_id}
                  </Text>
                  {w.stem && (
                    <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8, lineHeight: 1.4 }} numberOfLines={2}>
                      {w.stem}
                    </Text>
                  )}
                </View>
                {edit ? (
                  <View
                    onClick={(e) => { e?.stopPropagation?.(); onRemove(w.question_id); }}
                    style={{ padding: '8rpx 24rpx', background: 'var(--red-soft)', color: 'var(--red)', borderRadius: '999rpx', fontSize: '22rpx', fontWeight: 600, marginLeft: 12 }}
                  >移除</View>
                ) : (
                  <Text style={{ color: 'var(--ink-soft)', fontSize: '40rpx' }}>›</Text>
                )}
              </View>
              <View className="row-between" style={{ marginTop: 16 }}>
                <View className={w.mastered ? 'tag tag-mastered' : 'tag tag-hard'}>
                  {w.mastered ? '已掌握' : `错 ${w.wrong_count}`}
                </View>
                <Text style={{ fontSize: '22rpx', color: 'var(--ink-soft)' }}>{date}</Text>
              </View>
            </View>
          );
        })}

        {filteredItems.length > 0 && (
          <View style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
          }}>
            <Illustration kind="cloud" size={160} />
            <Text style={{ marginTop: 16, fontSize: '24rpx', color: 'var(--ink-mid)' }}>定期回顾错题，进步更快哦~</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}