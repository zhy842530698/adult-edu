import React from 'react';
import { Button } from 'antd';
import { useAuthStore } from '../store/auth';

interface Props {
  code: string;
  children: React.ReactElement;
}

export default function PermissionGuard({ code, children }: Props) {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  if (!hasPerm(code)) return null;
  return children;
}

export function PermButton(props: any & { code: string }) {
  const { code, ...rest } = props;
  const hasPerm = useAuthStore((s) => s.hasPerm);
  if (!hasPerm(code)) return null;
  return <Button {...rest} />;
}