/**
 * 骨架屏组件
 * 用于加载状态的占位展示
 */
import React from 'react';

interface SkeletonBlockProps {
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 是否圆形 */
  circle?: boolean;
  /** 是否启用动画 */
  animated?: boolean;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 样式 */
  style?: React.CSSProperties;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = 16,
  circle = false,
  animated = true,
  className = '',
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: circle ? '50%' : '8px',
    background: 'linear-gradient(90deg, #eef5ff 25%, #f3f8ff 50%, #eef5ff 75%)',
    backgroundSize: '200% 100%',
    animation: animated ? 'skeleton-shimmer 1.2s linear infinite' : undefined,
    ...style,
  };

  return (
    <div
      className={`skeleton-block ${className}`}
      style={baseStyle}
    />
  );
};

interface SkeletonCardProps {
  /** 行数 */
  rows?: number;
  /** 是否有标题 */
  hasHeader?: boolean;
  /** 额外的 CSS 类名 */
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  rows = 3,
  hasHeader = true,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-[14px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)] ${className}`}
    >
      {hasHeader && (
        <div className="flex items-center gap-3 mb-3">
          <SkeletonBlock width={40} height={40} circle />
          <div className="flex-1">
            <SkeletonBlock width="60%" height={16} />
            <SkeletonBlock width="40%" height={12} className="mt-2" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock
            key={i}
            width={i === rows - 1 ? '70%' : '100%'}
            height={12}
          />
        ))}
      </div>
    </div>
  );
};

interface SkeletonListProps {
  /** 条目数 */
  count?: number;
  /** 额外的 CSS 类名 */
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]"
        >
          <SkeletonBlock width={20} height={20} circle />
          <div className="flex-1">
            <SkeletonBlock width="80%" height={14} />
            <SkeletonBlock width="50%" height={10} className="mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// 对比结果骨架屏
export const CompareResultSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* 标题区 */}
      <div className="p-4 rounded-[14px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]">
        <SkeletonBlock width="40%" height={20} />
        <SkeletonBlock width="60%" height={14} className="mt-2" />
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]"
          >
            <SkeletonBlock width="50%" height={12} />
            <SkeletonBlock width="70%" height={24} className="mt-2" />
          </div>
        ))}
      </div>

      {/* 共识/差异双列 */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
      </div>

      {/* 维度分析 */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]"
          >
            <div className="flex items-center gap-2">
              <SkeletonBlock width={80} height={20} />
              <SkeletonBlock width={40} height={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonBlock;
