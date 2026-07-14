import React, { Component } from 'react';
import Taro from '@tarojs/taro';
import { api, getToken } from './api/client';
import './app.css';

/**
 * 启动后判定：
 *  - 未登录 → 跳 login
 *  - 已登录但未完成 onboarding → 跳 onboarding
 *  - 已完成 → 不动
 */
class App extends Component<{ children?: React.ReactNode }> {
  componentDidMount() {
    this.guard();
  }

  async guard() {
    try {
      const token = getToken();
      if (!token) return; // login 页面会自己处理
      const r = await api.get<any>('/user/onboarding-status');
      if (!r?.completed) {
        Taro.reLaunch({ url: '/pages/onboarding/index' });
      }
    } catch (e) {
      // 接口失败不强制跳转，让用户停留在当前页
      console.warn('[app.guard] onboarding-status failed', e);
    }
  }

  render() { return this.props.children; }
}
export default App;
