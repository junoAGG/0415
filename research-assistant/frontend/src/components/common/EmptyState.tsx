/**
 * 统一空状态组件
 * 用于显示各种空状态场景
 */
import React from 'react';
import { Button } from 'antd';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** 图标 */
  icon?: ReactNode;
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮 */
  action?: {
    text: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** 自定义底部内容 */
  footer?: ReactNode;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 最小高度 */
  minHeight?: number | string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  footer,
  className = '',
  minHeight = 340,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 ${className}`}
      style={{ minHeight }}
    >
      {icon && (
        <div className="mb-4 text-5xl text-[var(--text-faint)] opacity-60">
          {icon}
        </div>
      )}
      
      <h3 className="text-xl font-bold text-[var(--text)] mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-[var(--text-soft)] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          type="primary"
          onClick={action.onClick}
          icon={action.icon}
          className="mt-2"
          style={{
            background: 'linear-gradient(135deg, var(--blue-4), var(--blue-5))',
            borderRadius: '10px',
            height: '36px',
            fontWeight: 600,
          }}
        >
          {action.text}
        </Button>
      )}
      
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
