import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    const data = err.response?.data;
    if (status === 401) {
      message.error('登录已失效，请重新登录');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    } else if (data?.message) {
      message.error(`${data.code || 'ERROR'}: ${data.message}`);
    } else {
      message.error(err.message || '请求失败');
    }
    return Promise.reject(err);
  }
);

export type IdempotentRequest = AxiosRequestConfig & { idempotencyKey?: string };

export async function idempotentPost<T>(url: string, data?: any, key?: string): Promise<T> {
  const resp = await api.post<T>(url, data, {
    headers: key ? { 'Idempotency-Key': key } : {},
  });
  return resp.data;
}

export async function idempotentPut<T>(url: string, data?: any, key?: string): Promise<T> {
  const resp = await api.put<T>(url, data, {
    headers: key ? { 'Idempotency-Key': key } : {},
  });
  return resp.data;
}