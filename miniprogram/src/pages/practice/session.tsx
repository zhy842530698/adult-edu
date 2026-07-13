import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api, getToken } from '../../api/client';
import { optionStateClass, showError } from '../../utils/format';
import Icon from '../../components/Icon';

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
  const [answerState, setAnswerState] = useState<'correct' | 'wrong' | null>(null);

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
    setAnswerState(null);
  }, [idx, sess]);

  const toggle = (code: string) => {
    if (!q || revealed) return;
    if (q.question_type === 'SINGLE_CHOICE') setSelected([code]);
    else setSelected(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  const submitOne = async () => {
    if (!q || !selected.length) {
      Taro.showToast({ title: '请先选择答案', icon: 'none' });
      return;
    }
    try {
      await api.put<any>(
        `/practice-sessions/${id}/answers/${q.question_version_id}`,
        { selected_options: selected, time_spent_seconds: 0 },
        { idempotencyKey: `sess-${id}-q-${q.question_version_id}-${Date.now()}` },
      );
      const fresh = await api.get<any>(`/practice-sessions/${id}`);
      // 找出本题是否正确（用 reveal 后的 correct_options 与 selected 比对）
      const refreshed = fresh.questions?.[idx];
      const correctSet = new Set(refreshed?.correct_options || []);
      const allCorrect = selected.length === correctSet.size && selected.every((c) => correctSet.has(c));
      setAnswerState(allCorrect ? 'correct' : 'wrong');
      setSess(fresh);
      setRevealed(true);
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
    <View className="container" style={{ padding: '24rpx' }}>
      {/* 顶部导航条 (模拟原型 "< 1.3 函数的极限  ☆  ⊕") */}
      <View
        style={{
          background: '#fff',
          borderRadius: '24rpx',
          padding: '24rpx 32rpx',
          marginBottom: '24rpx',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <View className="row-between">
          <Text className="muted">{idx + 1} / {total}</Text>
          <View style={{
            fontSize: '22rpx',
            color: 'var(--brand)',
            background: 'var(--brand-soft)',
            padding: '4rpx 16rpx',
            borderRadius: '999rpx',
          }}>{sess.mode}</View>
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <View className="btn-icon" onClick={toggleFav}>
              <Text style={{ fontSize: '32rpx', color: favorite ? '#F59E0B' : 'var(--ink-mid)' }}>
                {favorite ? '★' : '☆'}
              </Text>
            </View>
            <View
              className="btn-icon"
              onClick={() => Taro.navigateTo({ url: `/pages/wrong/analysis?qvid=${q.question_version_id}&sess=${id}` })}
            >
              <Text style={{ fontSize: '28rpx', color: 'var(--ink-mid)' }}>⊕</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, display: 'flex', alignItems: 'center' }}>
          <View className="tag tag-doing">{q.question_type === 'SINGLE_CHOICE' ? '单选题' : '多选题'}</View>
          <View className="tag tag-gray">{q.score} 分</View>
        </View>
        <Text style={{ display: 'block', marginTop: 16, fontSize: '30rpx', color: 'var(--ink-deep)', lineHeight: 1.6 }}>
          {q.stem}
        </Text>
      </View>

      {/* 选项区 */}
      <View>
        {q.options.map((o) => {
          const isPicked = selected.includes(o.option_code);
          const isAnswer = correctSet.has(o.option_code);
          let state: 'selected' | 'correct' | 'wrong' | 'idle' = isPicked ? 'selected' : 'idle';
          if (revealed) {
            if (isAnswer) state = 'correct';
            else if (isPicked && !isAnswer) state = 'wrong';
          }
          return (
            <View
              key={o.option_code}
              className={optionStateClass(state)}
              onClick={() => toggle(o.option_code)}
              style={{ display: 'flex', alignItems: 'flex-start' }}
            >
              <Text style={{ fontWeight: 700, color: isPicked ? 'var(--brand)' : 'var(--ink-mid)', marginRight: 12 }}>
                {o.option_code}.
              </Text>
              <Text style={{ flex: 1, color: 'var(--ink-deep)' }}>{o.content}</Text>
            </View>
          );
        })}
      </View>

      {/* 反馈卡（仅在 reveal 后显示）*/}
      {revealed && answerState && (
        <View
          style={{
            marginTop: 24,
            background: answerState === 'correct' ? 'var(--green-soft)' : 'var(--red-soft)',
            borderRadius: '24rpx',
            padding: '24rpx 32rpx',
            border: answerState === 'correct' ? '2rpx solid var(--green)' : '2rpx solid var(--red)',
          }}
        >
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <View
              style={{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '999rpx',
                background: answerState === 'correct' ? 'var(--green)' : 'var(--red)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                marginRight: 12,
              }}
            >
              {answerState === 'correct' ? '✓' : '✕'}
            </View>
            <Text
              style={{
                fontSize: '28rpx',
                fontWeight: 600,
                color: answerState === 'correct' ? 'var(--green)' : 'var(--red)',
              }}
            >
              {answerState === 'correct' ? '回答正确' : '回答错误'}
            </Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            正确答案：{Array.from(correctSet).sort().join(', ')}
          </Text>
          {q.analysis && (
            <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
              解析：{q.analysis}
            </Text>
          )}
        </View>
      )}

      {/* 三键 */}
      <View className="row-between" style={{ marginTop: 32 }}>
        <View className="btn-ghost" onClick={goPrev} style={{ flex: 1, marginRight: 12 }}>上一题</View>
        <View className="btn-ghost" onClick={() => setShowCard(!showCard)} style={{ padding: '22rpx 32rpx' }}>
          <Text style={{ fontSize: '32rpx', color: 'var(--brand)' }}>≡</Text>
        </View>
        {idx < total - 1
          ? <View className="btn-primary" onClick={goNext} style={{ flex: 1, marginLeft: 12 }}>下一题</View>
          : <View className="btn-primary" onClick={submitAll} style={{ flex: 1, marginLeft: 12 }}>交卷</View>
        }
      </View>

      {!revealed && (
        <View className="btn-primary" onClick={submitOne} style={{ marginTop: 16 }}>
          保存本题答案
        </View>
      )}

      <Text onClick={onFeedback} style={{ textAlign: 'center', marginTop: 24, color: 'var(--ink-mid)', fontSize: '24rpx' }}>
        题目有误？点这里反馈
      </Text>

      {showCard && (
        <View
          style={{
            background: '#fff',
            padding: '24rpx',
            borderRadius: '24rpx',
            marginTop: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Text className="muted">答题卡（{answeredCount}/{total}）</Text>
          <View className="answer-grid" style={{ marginTop: 16 }}>
            {sess.questions.map((qq: any, i: number) => {
              const ans = (qq.user_answer || []).length > 0;
              const wrong = qq.is_correct === false;
              let cls = 'answer-cell';
              if (i === idx) cls += ' current';
              else if (wrong) cls += ' wrong';
              else if (ans) cls += ' done';
              return (
                <View key={qq.question_version_id} onClick={() => setIdx(i)} className={cls}>
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
