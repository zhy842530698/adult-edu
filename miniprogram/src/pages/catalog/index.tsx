import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Icon from '../../components/Icon';

/**
 * 题库 Tab —— 原型 §catalog
 * 顶部：搜索条 + 筛选标签
 * 内容：按 categories 渲染，每个 category 下挂若干 exam 行
 *       每行 exam 展开后：快捷练习按钮 + subjects → chapters → 章节练习入口 / 知识点练习入口
 */

interface KnowledgePoint {
  id: number; code: string; name: string; question_count?: number;
}
interface Chapter {
  id: number; code: string; name: string;
  question_count?: number;
  knowledge_points: KnowledgePoint[];
}
interface Subject {
  id: number; name: string;
  question_count?: number;
  chapters: Chapter[];
}
interface Exam {
  id: number; code: string; name: string; icon_url?: string;
  question_count?: number;
  subjects: Subject[];
}
interface Category {
  id: number; code: string; name: string; exams: Exam[];
}

const EXAM_COLORS = ['#2563EB', '#F8A800', '#10B881', '#EF4444', '#A78BFA', '#06B6D4'];

type PracticeOpts = {
  exam_id?: number;
  subject_id?: number;
  chapter_id?: number;
  knowledge_point_id?: number;
};

export default function CatalogPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<string>('全部');
  // 展开状态：哪个 exam、哪个 chapter 处于展开
  const [expandedExams, setExpandedExams] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  // 简单防重入：同一按钮在请求未返回前禁止再次点击
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/exam-catalog').then((r) => setCats(r.items || []))
      .catch((e) => showError(e, '加载目录失败'));
  }, []);

  // filter chip 数据：从后端 /exam-catalog 动态拉出每个 category 名
  const filterOptions = useMemo(
    () => ['全部', ...cats.map((c) => c.name)],
    [cats]
  );

  const startPractice = async (
    mode: string,
    opts: PracticeOpts = {},
    busy?: string,
  ) => {
    const k = busy || mode;
    if (busyKey === k) return;
    setBusyKey(k);
    try {
      const s = await api.post<any>('/practice-sessions', { mode, count: 10, ...opts });
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e: any) {
      const msg = (e && (e.message || e.errMsg)) || '';
      if (msg.includes('已通关')) {
        Taro.showToast({ title: '题库已通关 🎉', icon: 'none' });
      } else if (msg.includes('题量不足') || msg.includes('INSUFFICIENT')) {
        Taro.showToast({ title: '该范围暂无题目', icon: 'none' });
      } else {
        showError(e, '创建会话失败');
      }
    } finally {
      setBusyKey(null);
    }
  };

  const toggleExam = (id: number) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          exams: (c.exams || []).filter((e) =>
            e.name.toLowerCase().includes(k)
            || (e.subjects || []).some((s) =>
              s.name.toLowerCase().includes(k)
              || (s.chapters || []).some((ch) =>
                ch.name.toLowerCase().includes(k)
                || (ch.knowledge_points || []).some((kp) => kp.name.toLowerCase().includes(k))
              )
            )
          ),
        }))
        .filter((c) => c.exams.length > 0);
    }
    return result;
  }, [keyword, cats, filter]);

  const renderPracticeBtn = (
    label: string,
    bg: string,
    color: string,
    onClick: () => void,
    busy: boolean,
  ) => (
    <View
      onClick={(e) => { e?.stopPropagation?.(); onClick(); }}
      style={{
        background: busy ? 'var(--ink-soft)' : bg,
        color: busy ? '#fff' : color,
        padding: '10rpx 20rpx',
        borderRadius: '999rpx',
        fontSize: '24rpx',
        fontWeight: 600,
        marginLeft: 12,
      }}
    >{busy ? '加载中…' : label}</View>
  );

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* 顶部 */}
      <View style={{ padding: '32rpx 32rpx 0' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>题库</Text>
      </View>

      {/* 搜索条 —— 用 Input 真正可控输入 */}
      <View style={{
        margin: '24rpx 32rpx',
        background: '#fff',
        borderRadius: '999rpx',
        padding: '12rpx 28rpx',
        display: 'flex',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Icon name="search" size={28} color="var(--ink-mid)" />
        <Input
          value={keyword}
          onInput={(e: any) => setKeyword(e.detail.value)}
          placeholder="搜索题目、知识点"
          placeholderStyle="color:var(--ink-mid); font-size:26rpx;"
          style={{ flex: 1, marginLeft: 12, fontSize: '26rpx', color: 'var(--ink-deep)', background: 'transparent' }}
          confirmType="search"
        />
        {keyword && (
          <View onClick={() => setKeyword('')} style={{ padding: '0 8rpx' }}>
            <Icon name="cross" size={24} color="var(--ink-soft)" />
          </View>
        )}
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
            <Text style={{ color: 'var(--ink-mid)' }}>
              {keyword.trim() || filter !== '全部' ? '未找到匹配的题库' : '暂无题库数据'}
            </Text>
          </View>
        )}

        {filtered.map((cat) => (
          <View key={cat.id}>
            <View style={{ padding: '24rpx 0 16rpx' }}>
              <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>{cat.name}</Text>
            </View>
            {(cat.exams || []).map((exam, i) => {
              const color = EXAM_COLORS[i % EXAM_COLORS.length];
              const expanded = expandedExams.has(exam.id);
              const seqBusy = busyKey === `exam-seq-${exam.id}`;
              const randBusy = busyKey === `exam-rand-${exam.id}`;
              const total = exam.question_count ?? 0;
              return (
                <View key={exam.id} style={{ marginBottom: 16 }}>
                  {/* 卡片头：可点切换展开 */}
                  <View
                    className="card"
                    onClick={() => toggleExam(exam.id)}
                    style={expanded ? { borderColor: 'var(--brand)' } : undefined}
                  >
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
                        flexShrink: 0,
                      }}>
                        {exam.name.slice(0, 1)}
                      </View>
                      <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{exam.name}</Text>
                        <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>
                          题目 {total} 道 · 点击展开
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: '36rpx',
                        color: 'var(--ink-soft)',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms',
                      }}>›</Text>
                    </View>
                    {/* 快捷按钮 —— 即使未展开也可点；阻止冒泡避免误触 toggle */}
                    <View style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {renderPracticeBtn('顺序练习', '#EFF6FF', '#2563EB',
                        () => startPractice('SEQUENTIAL', { exam_id: exam.id }, `exam-seq-${exam.id}`),
                        seqBusy,
                      )}
                      {renderPracticeBtn('随机练习', '#FFF7ED', '#F8A800',
                        () => startPractice('RANDOM', { exam_id: exam.id }, `exam-rand-${exam.id}`),
                        randBusy,
                      )}
                    </View>
                  </View>

                  {/* 展开后：subjects → chapters → KPs */}
                  {expanded && (
                    <View style={{
                      marginTop: 12,
                      padding: '16rpx 24rpx',
                      background: '#fff',
                      borderRadius: '20rpx',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      {(exam.subjects || []).length === 0 && (
                        <View style={{ padding: '20rpx 0', textAlign: 'center' }}>
                          <Text style={{ color: 'var(--ink-mid)', fontSize: '24rpx' }}>暂无学科分类</Text>
                        </View>
                      )}
                      {(exam.subjects || []).map((sub) => {
                        const subBusy = busyKey === `sub-${sub.id}`;
                        return (
                          <View key={sub.id} style={{ marginBottom: 16 }}>
                            <View style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12rpx 0', borderBottom: '1rpx solid var(--bg-soft)',
                            }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{sub.name}</Text>
                                <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 4 }}>
                                  共 {sub.question_count ?? 0} 道
                                </Text>
                              </View>
                              {renderPracticeBtn('学科练习', '#FEF3C7', '#B45309',
                                () => startPractice('RANDOM', { exam_id: exam.id, subject_id: sub.id }, `sub-${sub.id}`),
                                subBusy,
                              )}
                            </View>
                            {(sub.chapters || []).map((ch) => {
                              const chExpanded = expandedChapters.has(ch.id);
                              const chBusy = busyKey === `ch-${ch.id}`;
                              const kps = ch.knowledge_points || [];
                              return (
                                <View key={ch.id} style={{ borderBottom: '1rpx solid var(--bg-soft)' }}>
                                  <View style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16rpx 8rpx',
                                  }}>
                                    <View
                                      style={{ flex: 1, display: 'flex', alignItems: 'center' }}
                                      onClick={(e) => { e?.stopPropagation?.(); toggleChapter(ch.id); }}
                                    >
                                      <Text style={{
                                        color: 'var(--ink-soft)', marginRight: 8, fontSize: '24rpx',
                                        transform: chExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 200ms',
                                      }}>›</Text>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: '26rpx', color: 'var(--ink-deep)' }}>{ch.name}</Text>
                                        <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 4 }}>
                                          {ch.question_count != null ? `${ch.question_count} 道` : '题目加载中'}
                                          {kps.length > 0 ? ` · ${kps.length} 个知识点` : ''}
                                        </Text>
                                      </View>
                                    </View>
                                    {renderPracticeBtn('章节练习', '#ECFDF5', '#10B881',
                                      () => startPractice('CHAPTER', { exam_id: exam.id, chapter_id: ch.id }, `ch-${ch.id}`),
                                      chBusy,
                                    )}
                                  </View>
                                  {/* 展开后呈现知识点 */}
                                  {chExpanded && (
                                    <View style={{ padding: '0 16rpx 16rpx 32rpx' }}>
                                      {kps.length === 0 && (
                                        <Text style={{ color: 'var(--ink-soft)', fontSize: '22rpx' }}>本章节暂无知识点</Text>
                                      )}
                                      {kps.map((kp) => {
                                        const kpBusy = busyKey === `kp-${kp.id}`;
                                        return (
                                          <View key={kp.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12rpx 0',
                                          }}>
                                            <Text style={{ flex: 1, fontSize: '24rpx', color: 'var(--ink-mid)' }}>· {kp.name}</Text>
                                            {renderPracticeBtn('练知识点', '#FEF2F2', '#EF4444',
                                              () => startPractice('KNOWLEDGE', { knowledge_point_id: kp.id }, `kp-${kp.id}`),
                                              kpBusy,
                                            )}
                                          </View>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
