/**
 * 投研助手 - 金融科技专业主题
 * Fintech Professional Design System
 */

// 主色调 - 深蓝专业金融风
export const colors = {
  // 主色
  primary: '#1a365d',      // 深海蓝 - 主品牌色
  primaryLight: '#2c5282', // 浅海蓝
  primaryDark: '#0d1b2a',  // 深海蓝暗色
  
  // 辅助色
  accent: '#d4af37',       // 金色 - 强调、高亮
  accentLight: '#f0d878',  // 浅金
  accentDark: '#b8941f',   // 深金
  
  // 功能色
  success: '#059669',      // 翠绿 - 上涨、成功
  successLight: '#10b981', // 亮绿
  danger: '#dc2626',       // 深红 - 下跌、危险
  dangerLight: '#ef4444',  // 亮红
  warning: '#d97706',      // 琥珀 - 警告
  info: '#2563eb',         // 蓝色 - 信息
  
  // 中性色
  background: '#f8fafc',   // 背景灰
  surface: '#ffffff',      // 卡片表面
  border: '#e2e8f0',       // 边框
  divider: '#f1f5f9',      // 分割线
  
  // 文字色
  textPrimary: '#0f172a',   // 主文字 - 近黑
  textSecondary: '#475569', // 次要文字
  textMuted: '#94a3b8',     // 弱化文字
  textInverse: '#ffffff',   // 反色文字
};

// 渐变
export const gradients = {
  primary: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
  accent: 'linear-gradient(135deg, #d4af37 0%, #f0d878 100%)',
  success: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  danger: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  card: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  header: 'linear-gradient(90deg, #0d1b2a 0%, #1a365d 50%, #2c5282 100%)',
};

// 阴影
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  glow: '0 0 20px rgba(212, 175, 55, 0.3)',
  card: '0 2px 8px rgba(26, 54, 93, 0.08)',
  cardHover: '0 8px 24px rgba(26, 54, 93, 0.15)',
};

// 圆角
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// 间距
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// 字体
export const typography = {
  fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    display: '32px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// 动画
export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// 组件样式预设
export const componentStyles = {
  // 按钮
  button: {
    primary: {
      background: gradients.primary,
      color: colors.textInverse,
      border: 'none',
      borderRadius: borderRadius.md,
      boxShadow: shadows.md,
      fontWeight: typography.fontWeight.semibold,
      transition: transitions.normal,
    },
    accent: {
      background: gradients.accent,
      color: colors.textPrimary,
      border: 'none',
      borderRadius: borderRadius.md,
      boxShadow: `${shadows.md}, ${shadows.glow}`,
      fontWeight: typography.fontWeight.semibold,
    },
    ghost: {
      background: 'transparent',
      color: colors.primary,
      border: `1px solid ${colors.border}`,
      borderRadius: borderRadius.md,
    },
  },
  
  // 卡片
  card: {
    background: colors.surface,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.card,
    border: `1px solid ${colors.border}`,
    transition: transitions.normal,
  },
  
  // 标签
  tag: {
    auto: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: borderRadius.full,
    },
    rating: {
      buy: { background: colors.success, color: '#fff' },
      hold: { background: colors.warning, color: '#fff' },
      sell: { background: colors.danger, color: '#fff' },
    },
    status: {
      completed: { background: '#dcfce7', color: colors.success, border: `1px solid ${colors.success}` },
      pending: { background: '#fef3c7', color: colors.warning, border: `1px solid ${colors.warning}` },
      error: { background: '#fee2e2', color: colors.danger, border: `1px solid ${colors.danger}` },
    },
  },
  
  // 输入框
  input: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    focusBorder: colors.primary,
    focusShadow: `0 0 0 3px rgba(26, 54, 93, 0.1)`,
  },
  
  // 导航
  nav: {
    background: gradients.header,
    height: '64px',
    item: {
      color: 'rgba(255, 255, 255, 0.7)',
      activeColor: colors.accent,
      hoverColor: '#fff',
    },
  },
};

// 响应式断点
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
};

// 布局
export const layout = {
  sidebarWidth: '320px',
  headerHeight: '64px',
  contentMaxWidth: '1440px',
};

export default {
  colors,
  gradients,
  shadows,
  borderRadius,
  spacing,
  typography,
  transitions,
  componentStyles,
  breakpoints,
  layout,
};
