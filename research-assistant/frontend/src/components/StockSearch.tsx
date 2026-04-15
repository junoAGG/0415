import { useState, useCallback } from 'react';
import { AutoComplete, Input, Tag } from 'antd';
import { SearchOutlined, StockOutlined } from '@ant-design/icons';
import { stockApi } from '../services/api';
import type { Stock } from '../types';
import { colors, borderRadius } from '../styles/fintech-theme';

interface StockSearchProps {
  onSelect: (stock: Stock) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function StockSearch({ onSelect, placeholder = '搜索股票代码或名称...', style }: StockSearchProps) {
  const [options, setOptions] = useState<{ value: string; label: React.ReactNode; stock: Stock }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await stockApi.search(keyword);
      // 兼容多种响应格式：response.items 数组或 response 本身为数组
      const items: Stock[] = Array.isArray(response)
        ? (response as unknown as Stock[])
        : (response?.items || []);
      
      const newOptions = items.map(stock => ({
        value: stock.code,
        stock,
        label: (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '4px 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StockOutlined style={{ color: colors.primary }} />
              <span style={{ fontWeight: 500, color: colors.textPrimary }}>
                {stock.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag 
                style={{ 
                  fontSize: '11px',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  borderRadius: borderRadius.sm,
                  margin: 0,
                }}
              >
                {stock.code}
              </Tag>
              <Tag 
                style={{ 
                  fontSize: '11px',
                  background: `${colors.primary}15`,
                  border: 'none',
                  color: colors.primary,
                  borderRadius: borderRadius.sm,
                  margin: 0,
                }}
              >
                {stock.industry}
              </Tag>
            </div>
          </div>
        ),
      }));
      
      setOptions(newOptions);
    } catch (error) {
      console.error('搜索股票失败:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback((value: string, option: any) => {
    if (option?.stock) {
      onSelect(option.stock);
    }
  }, [onSelect]);

  return (
    <AutoComplete
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      style={{ width: '100%', ...style }}
      notFoundContent={loading ? '搜索中...' : '暂无匹配股票'}
    >
      <Input
        prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
        placeholder={placeholder}
        allowClear
        style={{
          borderRadius: borderRadius.md,
          border: `1px solid ${colors.border}`,
        }}
      />
    </AutoComplete>
  );
}
