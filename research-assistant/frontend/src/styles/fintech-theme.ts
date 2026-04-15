/**
 * 投研助手 - 金融科技专业主题
 * 匹配 workbench HTML 原型的浅蓝金色设计系统
 */

// 主色调 - 浅蓝金色专业风
export const colors = {
  // 背景色
  bg: '#f3f8ff',
  bgSoft: '#eef5ff',
  panel: 'rgba(255, 255, 255, 0.92)',
  panelStrong: '#ffffff',
  
  // 边框线
  line: '#d7e4f5',
  lineStrong: '#b9d0ea',
  
  // 文字色
  text: '#12233f',
  textSoft: '#57708f',
  textFaint: '#7d92ad',
  textInverse: '#ffffff',
  
  // 蓝色系
  blue1: '#dff1ff',
  blue2: '#b7ddff',
  blue3: '#6eb6ff',
  blue4: '#2b6cb0',
  blue5: '#183b70',
  
  // 金色系
  gold1: '#fff3cb',
  gold2: '#f4cf73',
  gold3: '#d3a63d',
  
  // 功能色
  green: '#18a16d',
  red: '#cf4b5a',
  orange: '#da8b2f',
  
  // 兼容旧接口
  primary: '#183b70',
  primaryLight: '#2b6cb0',
  accent: '#f4cf73',
  accentLight: '#fff3cb',
  success: '#18a16d',
  successLight: '#67f4b1',
  danger: '#cf4b5a',
  dangerLight: '#ef4444',
  warning: '#da8b2f',
  info: '#2b6cb0',
  background: '#f3f8ff',
  surface: '#ffffff',
  border: '#d7e4f5',
  divider: '#eef5ff',
  textPrimary: '#12233f',
  textSecondary: '#57708f',
  textMuted: '#7d92ad',
};

// 渐变
export const gradients = {
  header: 'linear-gradient(120deg, rgba(16, 43, 86, 0.95), rgba(31, 78, 143, 0.94))',
  primary: 'linear-gradient(135deg, #2b6cb0, #183b70)',
  accent: 'linear-gradient(135deg, #fff4d5, #f6dc8f)',
  gold: 'linear-gradient(135deg, #fff3cb, #f4cf73)',
  card: 'linear-gradient(180deg, rgba(255,255,255,0.97), rgba(244,248,254,0.95))',
  cardActive: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(235,246,255,0.98))',
  heroDetail: `
    radial-gradient(circle at right top, rgba(255,214,90,0.22), transparent 28%),
    radial-gradient(circle at left bottom, rgba(127,207,255,0.16), transparent 32%),
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,248,255,0.95))
  `,
  shellCard: `
    linear-gradient(130deg, rgba(244,207,115,0.08), transparent 22%, transparent 78%, rgba(43,108,176,0.05)),
    linear-gradient(180deg, rgba(255,255,255,0.3), transparent 18%)
  `,
  metricBar: 'linear-gradient(90deg, #6eb6ff, #f4cf73)',
  bodyBg: `
    radial-gradient(circle at top left, rgba(244, 207, 115, 0.25), transparent 28%),
    radial-gradient(circle at top right, rgba(110, 182, 255, 0.22), transparent 24%),
    linear-gradient(180deg, #f9fcff 0%, #f3f8ff 38%, #edf4fb 100%)
  `,
  input: 'linear-gradient(180deg, #ffffff, #f7fbff)',
  btnSecondary: 'linear-gradient(135deg, #ffffff, #edf6ff)',
  success: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  danger: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
};

// 阴影
export const shadows = {
  lg: '0 18px 44px rgba(24, 59, 112, 0.1)',
  md: '0 10px 24px rgba(39, 76, 126, 0.08)',
  sm: '0 4px 12px rgba(39, 76, 126, 0.05)',
  card: '0 10px 24px rgba(39, 76, 126, 0.08)',
  cardHover: '0 10px 20px rgba(31, 78, 143, 0.12)',
  glow: '0 0 14px #67f4b1',
  btnPrimary: '0 8px 18px rgba(43, 108, 176, 0.22)',
  btnGold: '0 8px 18px rgba(244, 207, 115, 0.24)',
};

// 圆角
export const borderRadius = {
  xl: '20px',
  lg: '14px',
  md: '12px',
  sm: '8px',
  xs: '6px',
  full: '999px',
  shell: '22px',
  btn: '10px',
  card: '14px',
  chip: '999px',
  tab: '10px',
};

// 间距
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

// 字体
export const typography = {
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  fontDisplay: '"PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: {
    xs: '10px',
    sm: '11px',
    md: '12px',
    base: '13px',
    lg: '14px',
    xl: '15px',
    '2xl': '18px',
    '3xl': '24px',
    display: '28px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
};

// 动画
export const transitions = {
  fast: '0.14s ease',
  normal: '0.22s ease',
  slow: '0.28s ease',
};

// 组件样式预设
export const componentStyles = {
  button: {
    primary: {
      color: '#fff',
      background: gradients.primary,
      boxShadow: shadows.btnPrimary,
      borderRadius: borderRadius.btn,
      fontWeight: 700,
    },
    secondary: {
      color: colors.blue5,
      background: gradients.btnSecondary,
      border: `1px solid ${colors.line}`,
      borderRadius: borderRadius.btn,
    },
    gold: {
      color: '#6b4b00',
      background: gradients.gold,
      boxShadow: shadows.btnGold,
      borderRadius: borderRadius.btn,
      fontWeight: 700,
    },
  },
  card: {
    background: colors.panel,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.md,
    border: `1px solid rgba(185, 208, 234, 0.9)`,
  },
  input: {
    border: `1px solid ${colors.line}`,
    background: gradients.input,
    borderRadius: borderRadius.btn,
  },
  chip: {
    auto: { color: '#6f4d00', background: 'linear-gradient(135deg, #fff4d5, #f6dc8f)' },
    upload: { color: '#1b4d88', background: 'linear-gradient(135deg, #edf6ff, #d8ebff)' },
    completed: { color: '#116f50', background: '#def5eb', border: '1px solid #a4e1c5' },
    pending: { color: '#875600', background: '#fff1d6', border: '1px solid #f3d08b' },
    failed: { color: '#a42a3a', background: '#ffe0e5', border: '1px solid #f0a8b5' },
    parsing: { color: '#185da7', background: '#e0f0ff', border: '1px solid #9ecfff' },
    rating: { color: '#173a6f', background: '#e6f3ff', border: '1px solid #bddcff' },
  },
};

// 响应式断点
export const breakpoints = {
  sm: '640px',
  md: '980px',
  lg: '1360px',
  xl: '1680px',
};

// 布局
export const layout = {
  sidebarWidth: '320px',
  detailMinWidth: '720px',
  asideWidth: '296px',
  panelHeight: '720px',
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
