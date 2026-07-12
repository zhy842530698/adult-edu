// 工具方法
export function fmtDate(s?: string | null) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => n < 10 ? '0' + n : '' + n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateOnly(s?: string | null) {
  if (!s) return '';
  return s.slice(0, 10);
}

export function showError(e: any, fallback = '操作失败') {
  const msg = (e && (e.message || e.errMsg)) || fallback;
  Taro.showToast({ title: msg, icon: 'none', duration: 2500 });
}

import Taro from '@tarojs/taro';

export function goBackOr(delta = 1) {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) Taro.navigateBack({ delta });
  else Taro.switchTab({ url: '/pages/home/index' });
}

export function optionStateClass(state: 'selected' | 'correct' | 'wrong' | 'idle') {
  if (state === 'selected') return 'option selected';
  if (state === 'correct') return 'option correct';
  if (state === 'wrong') return 'option wrong';
  return 'option';
}