import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api, getToken } from '../../api/client';
import { optionStateClass, showError } from '../../utils/format';

interface QuestionBlock {
  question_version_id: number;
  question_id: number;
  question_type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  stem: string;
  options: { option_code: string; content: string }[];
  score: number;
  reveal?: boolean;
  correct_options?: string[];
  analysis?: string;
  user_answer?: string[];
  is_correct?: boolean;
}

export default function SessionPage() {
  const id = Number(Taro.getCurrentInstance()?.router?.params?.id);
  const [sess, setSess] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!getToken()) { Taro.redirectTo({ url: '/pages/login/index' }); return; }
    if (!id) { Taro.showToast({ title: '缺少会话ID', icon: 'none' }); return; }
    api.get<any>(`/practice-sessions/${id}`).then(setSess);
  }, [id]);

  const q: QuestionBlock | undefined = sess?.questions?.[idx];
  const total = sess?.questions?.length || 0;

  useEffect(() => {
    setSelected(q?.user_answer || []);
    setRevealed(sess?.mode !== 'MOCK' || sess?.status === 'SUBMITTED');
  }, [idx, sess]);

  const toggle = (code: string) => {
    if (!q || revealed) return;
    if (q.question_type === 'SINGLE_CHOICE') {
      setSelected([code]);
    } else {
      setSelected(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
    }
  };

  const submitOne = async () => {
    if (!q || !selected.length) {
      Taro.showToast({ title: '请先选择答案', icon: 'none' });
      return;
    }
    try {
      const r = await api.put<any>(
        `/practice-sessions/${id}/answers/${q.question_version_id}`,
        { selected_options: selected, time_spent_seconds: 0 },
        { idempotencyKey: `sess-${id}-q-${q.question_version_id}-${Date.now()}` },
      );
      // refresh session
      const fresh = await api.get<any>(`/practice-sessions/${id}`);
      setSess(fresh);
      setRevealed(true);
      // mark local answered state
      q.user_answer = r.selected_options;
      q.is_correct = false;
      // server-side correctness only available after submit; we optimistically guess:
      q.user_answer = r.selected_options;
    } catch (e) { showError(e, '保存失败'); }
  };

  const goPrev = () => setIdx(Math.max(0, idx - 1));
  const goNext = () => setIdx(Math.min(total - 1, idx + 1));

  const submitAll = async () => {
    try {
      await api.post(`/practice-sessions/${id}/submit`, {},
        { idempotencyKey: `submit-${id}-${Date.now()}` });
      Taro.redirectTo({ url: `/pages/practice/result?id=${id}` });
    } catch (e) { showError(e, '交卷失败'); }
  };

  const toggleFav = async () => {
    if (!q) return;
    try {
      if (favorite) await api.delete(`/questions/${q.question_id}/favorite`);
      else await api.put(`/questions/${q.question_id}/favorite`, {});
      setFavorite(!favorite);
    } catch (e) { showError(e, '收藏失败'); }
  };

  const onFeedback = () => {
    if (!q) return;
    Taro.navigateTo({ url: `/pages/feedback/index?qid=${q.question_id}&qvid=${q.question_version_id}&sess=${id}` });
  };

  if (!sess || !q) {
    return <View className="container"><Text>加载中…</Text></View>;
  }

  const answeredCount = sess.questions.filter((x: any) => (x.user_answer || []).length > 0).length;
  const correctSet = new Set((q.correct_options || []).map((c) => c));

  return (
    <View className="container">
      <View className="card">
        <View className="row-between">
          <Text className="muted">{idx + 1} / {total} · {sess.mode}</Text>
          <Text onClick={() => setShowCard(!showCard)} className="muted">{showCard ? '收起' : '答题卡'}</Text>
        </View>
        <View className="row" style={{ marginTop: '8rpx' }}>
          <Text className="tag">{q.question_type === 'SINGLE_CHOICE' ? '单选' : '多选'}</Text>
          <Text className="tag gray">{q.score} 分</Text>
          <View className="tag" onClick={toggleFav}>{favorite ? '★ 已收藏' : '☆ 收藏'}</View>
        </View>
        <Text style={{ display: 'block', marginTop: '16rpx', fontSize: '30rpx' }}>{q.stem}</Text>
      </View>

      <ScrollView scrollY style={{ maxHeight: '900rpx' }}>
        {q.options.map((o) => {
          const isPicked = selected.includes(o.option_code);
          const isAnswer = correctSet.has(o.option_code);
          let state: 'selected' | 'correct' | 'wrong' | 'idle' = isPicked ? 'selected' : 'idle';
          if (revealed) {
            if (isAnswer) state = 'correct';
            else if (isPicked && !isAnswer) state = 'wrong';
          }
          return (
            <View key={o.option_code} className={optionStateClass(state)} onClick={() => toggle(o.option_code)}>
              <Text style={{ fontWeight: 600 }}>{o.option_code}. </Text>
              <Text>{o.content}</Text>
            </View>
          );
        })}
      </ScrollView>

      {revealed && q.analysis && (
        <View className="card">
          <Text className="muted">解析</Text>
          <Text style={{ display: 'block', marginTop: '8rpx' }}>{q.analysis}</Text>
        </View>
      )}

      <View className="row-between" style={{ marginTop: '16rpx' }}>
        <View className="btn-ghost" onClick={goPrev} style={{ flex: 1, marginRight: '12rpx' }}>上一题</View>
        {idx < total - 1
          ? <View className="btn-primary" onClick={goNext} style={{ flex: 1, marginLeft: '12rpx' }}>下一题</View>
          : <View className="btn-primary" onClick={submitAll} style={{ flex: 1, marginLeft: '12rpx' }}>交卷</View>
        }
      </View>

      {!revealed && (
        <View className="btn-primary" onClick={submitOne} style={{ marginTop: '12rpx' }}>
          保存本题答案
        </View>
      )}

      <View className="tip" onClick={onFeedback} style={{ textAlign: 'center', marginTop: '16rpx' }}>
        题目有误？点这里反馈
      </View>

      {showCard && (
        <View style={{ background: '#fff', padding: '16rpx', borderRadius: '12rpx', marginTop: '16rpx' }}>
          <Text className="muted">答题卡（{answeredCount}/{total}）</Text>
          <View className="row" style={{ flexWrap: 'wrap', marginTop: '12rpx' }}>
            {sess.questions.map((qq: any, i: number) => {
              const ans = (qq.user_answer || []).length > 0;
              return (
                <View key={qq.question_version_id} onClick={() => setIdx(i)}
                  style={{
                    width: '60rpx', height: '60rpx', lineHeight: '60rpx', textAlign: 'center',
                    margin: '6rpx', borderRadius: '8rpx',
                    background: i === idx ? '#1677ff' : ans ? '#52c41a' : '#eee',
                    color: i === idx || ans ? '#fff' : '#1f1f1f',
                  }}>
                  {i + 1}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}