import { useState } from 'react';
import { Drawer } from 'antd';
import { StockOutlined } from '@ant-design/icons';
import StockSearch from './StockSearch';
import StockInfoCard from './StockInfoCard';
import type { Stock } from '../types';
import { colors } from '../styles/fintech-theme';

interface StockPanelProps {
  visible: boolean;
  onClose: () => void;
  initialStockCode?: string;
}

export default function StockPanel({ visible, onClose, initialStockCode }: StockPanelProps) {
  const [stockCode, setStockCode] = useState(initialStockCode || '');

  const handleSelect = (stock: Stock) => {
    setStockCode(stock.code);
  };

  // 当 initialStockCode 变化时同步
  if (initialStockCode && initialStockCode !== stockCode && !stockCode) {
    setStockCode(initialStockCode);
  }

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      width={420}
      placement="right"
      closable={false}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
      }}
    >
      {/* 自定义标题栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${colors.border}`,
        background: '#fff',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StockOutlined style={{ fontSize: 18, color: colors.primary }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>股票数据</span>
        </div>
        <span
          onClick={onClose}
          style={{
            fontSize: 14,
            color: colors.primaryLight,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          关闭
        </span>
      </div>

      {/* 搜索栏 */}
      <div style={{ padding: '12px 16px', flexShrink: 0, borderBottom: `1px solid ${colors.divider}` }}>
        <StockSearch
          onSelect={handleSelect}
          placeholder="输入股票代码或名称搜索..."
        />
      </div>

      {/* 股票数据内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 20px' }}>
        {stockCode ? (
          <StockInfoCard stockCode={stockCode} />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: colors.textMuted,
            gap: 12,
            padding: 40,
            textAlign: 'center',
          }}>
            <StockOutlined style={{ fontSize: 48, opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>请搜索或选择股票</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              输入股票代码或名称开始查看行情数据
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
