import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Icon from '../../components/Icon';

/**
 * 题库 Tab —— 原型 §catalog
 * 顶部：搜索条 + 筛选标签
 * 内容：按 categories 渲染，每个 category 下挂若干 exam 行
 *       每行 exam 含 信息卡（彩色 icon + 名称 + 题量 + 正确率）
 *       点击 exam 展开 subjects → chapters → 章节练习入口
 */

interface Chapter {
  id: number; code: string; name: string;
  knowledge_points?: { id: number; name: string }[];
}
interface Subject {
  id: number; name: string; chapters: Chapter[];
}
interface Exam {
  id: number; code: string; name: string; icon_url?: string; subjects: Subject[];
}
interface Category {
  id: number; code: string; name: string; exams: Exam[];
}

const EXAM_COLORS = ['#2563EB', '#F8A800', '#10B881', '#EF4444', '#A78BFA', '#06B6D4'];

export default function CatalogPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<string>('全部');

  useEffect(() => {
    api.get<any>('/exam-catalog').then((r) => setCats(r.items || []))
      .catch((e) => showError(e, '加载目录失败'));
  }, []);

  // filter chip 数据：从后端 /exam-catalog 动态拉出每个 category 名
  const filterOptions = useMemo(
    () => ['全部', ...cats.map((c) => c.name)],
    [cats]
  );

  const startPractice = async (mode: string, exam_id?: number, chapter_id?: number, knowledge_point_id?: number) => {
    try {
      const s = await api.post<any>('/practice-sessions', {
        mode, count: 10, exam_id, chapter_id, knowledge_point_id,
      });
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) { showError(e, '创建会话失败'); }
  };

  const filtered = useMemo(() => {
    let result = cats;
    if (filter !== '全部') {
      result = result.filter((c) => c.name === filter);
    }
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      result = result
        .map((c) => ({
          ...c,
          exams: (c.exams || []).filter((e) => e.name.toLowerCase().includes(k)
            || (e.subjects || []).some((s) => (s.chapters || []).some((ch) => ch.name.toLowerCase().includes(k)))),
        }))
        .filter((c) => c.exams.length > 0);
    }
    return result;
  }, [keyword, cats, filter]);

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* 顶部 */}
      <View style={{ padding: '32rpx 32rpx 0' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>题库</Text>
      </View>
      {/* 搜索条 */}
      <View style={{
        margin: '24rpx 32rpx',
        background: '#fff',
        borderRadius: '999rpx',
        padding: '16rpx 28rpx',
        display: 'flex',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Icon name="search" size={28} color="var(--ink-mid)" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: 'var(--ink-mid)', fontSize: '26rpx' }}>搜索题目、知识点</Text>
        </View>
      </View>

      {/* 筛选 tab —— 来自后端 /exam-catalog 的 categories */}
      <ScrollView scrollX style={{ whiteSpace: 'nowrap', padding: '0 32rpx', height: '64rpx' }} showScrollbar={false}>
        {filterOptions.map((t) => (
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

      <ScrollView scrollY style={{ padding: '24rpx 32rpx 120rpx' }}>
        {filtered.length === 0 && (
          <View style={{ padding: '120rpx 0', textAlign: 'center' }}>
            <Text style={{ color: 'var(--ink-mid)' }}>暂无符合条件的题库</Text>
          </View>
        )}

        {filtered.map((cat) => (
          <View key={cat.id}>
            <View style={{ padding: '24rpx 0 16rpx' }}>
              <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>{cat.name}</Text>
            </View>
            {(cat.exams || []).map((exam, i) => {
              const color = EXAM_COLORS[i % EXAM_COLORS.length];
              return (
                <View key={exam.id} className="card">
                  <View style={{ display: 'flex', alignItems: 'center' }}>
                    <View style={{
                      width: '64rpx', height: '64rpx',
                      borderRadius: '16rpx',
                      background: `${color}1A`,
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700, fontSize: '32rpx',
                    }}>
                      {exam.name.slice(0, 1)}
                    </View>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                      <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{exam.name}</Text>
                      <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>
                        题目 {exam.question_count ?? 0} 道
                      </Text>
                    </View>
                    <Text style={{ fontSize: '40rpx', color: 'var(--ink-soft)' }}>›</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
