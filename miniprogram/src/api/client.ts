import Taro from '@tarojs/taro';

const BASE_URL = process.env.TARO_APP_API_BASE || 'http://127.0.0.1:8000/api/v1';

export interface ApiEnvelope<T = any> {
  code?: string;
  message?: string;
  data?: T;
  items?: any[];
  total?: number;
  page?: number;
  page_size?: number;
  [k: string]: any;
}

export function getToken(): string | null {
  return Taro.getStorageSync('user-token') || null;
}

export function setToken(token: string | null) {
  if (token) Taro.setStorageSync('user-token', token);
  else Taro.removeStorageSync('user-token');
}

async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any,
  opts: { idempotencyKey?: string; raw?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const resp = await Taro.request({
    url: `${BASE_URL}${path}`,
    method,
    data: body,
    header: headers,
  });
  if (resp.statusCode >= 400) {
    const data: any = resp.data || {};
    const msg = data.message || data.code || `HTTP ${resp.statusCode}`;
    throw new Error(msg);
  }
  const data: any = resp.data || {};
  if (data.code && data.code !== 'OK' && !data.data) {
    throw new Error(data.message || data.code);
  }
  return resp.data as T;
}

export const api = {
  get: <T = any>(path: string, params?: any) => {
    const qs = params ? '?' + Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : '';
    return request<T>('GET', qs ? path + qs : path);
  },
  post: <T = any>(path: string, body?: any, opts?: { idempotencyKey?: string }) =>
    request<T>('POST', path, body, opts),
  put: <T = any>(path: string, body?: any, opts?: { idempotencyKey?: string }) =>
    request<T>('PUT', path, body, opts),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
};
