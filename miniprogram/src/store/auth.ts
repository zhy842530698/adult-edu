import Taro from '@tarojs/taro';
import { api, setToken } from '../api/client';

export interface UserInfo {
  id: number;
  openid: string;
  nickname?: string;
  avatar_url?: string;
  agreed_privacy_version?: string;
}

export interface ExamTarget {
  id: number;
  exam_id: number;
  exam_name?: string;
  is_primary: boolean;
  target_daily_count?: number;
  target_exam_date?: string;
}

let _user: UserInfo | null = null;
let _targets: ExamTarget[] = [];

export function getUser(): UserInfo | null { return _user; }

export function getTargets(): ExamTarget[] { return _targets; }

export async function bootstrapFromStorage() {
  const cached = Taro.getStorageSync('user-info');
  if (cached) _user = cached;
  const tgt = Taro.getStorageSync('user-targets');
  if (Array.isArray(tgt)) _targets = tgt;
}

export async function loginWithMock(openid = 'mock-user-001', nickname = '测试用户') {
  const resp = await api.post<{ token: string; user: UserInfo }>('/auth/wechat/login', {
    code: `mock-${openid}`, nickname,
  });
  setToken(resp.token);
  _user = resp.user;
  Taro.setStorageSync('user-info', resp.user);
  return resp.user;
}

export function logout() {
  setToken(null);
  _user = null;
  _targets = [];
  Taro.removeStorageSync('user-info');
  Taro.removeStorageSync('user-targets');
}

export async function loadTargets() {
  try {
    const r = await api.get<{ items: ExamTarget[] }>('/user/exam-targets');
    _targets = r.items || [];
  } catch {
    _targets = [];
  }
  Taro.setStorageSync('user-targets', _targets);
  return _targets;
}

export async function setPrimaryExam(examId: number) {
  await api.post('/user/exam-targets', { exam_id: examId, is_primary: true });
  await loadTargets();
}

export async function setDailyTarget(count: number) {
  await api.put('/user/daily-target', { count });
  await loadTargets();
}