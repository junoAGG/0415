/**
 * 对比分析配置面板
 * 左栏：研报选择、维度选择、对比类型
 */
import React from 'react';
import { Button } from 'antd';
import type { Report } from '../../types';
import type { CompareDimension, DimensionMeta } from '../../types/analysis';
import { DIMENSION_LIST, SCENE_DIMENSIONS } from '../../types/analysis';
import EmptyState from '../common/EmptyState';
import { InboxOutlined } from '@ant-design/icons';

interface ComparePanelProps {
  /** 可用研报列表 */
  reports: Report[];
  /** 已选研报ID */
  selectedReports: string[];
  /** 对比类型 */
  compareType: 'company' | 'industry' | 'custom';
  /** 已选维度 */
  selectedDimensions: CompareDimension[];
  /** 是否正在对比分析 */
  comparing: boolean;
  /** 切换研报选择 */
  onToggleReport: (id: string) => void;
  /** 全选研报 */
  onSelectAll: () => void;
  /** 设置对比类型 */
  onSetCompareType: (type: 'company' | 'industry' | 'custom') => void;
  /** 设置选中维度 */
  onSetDimensions: (dimensions: CompareDimension[]) => void;
  /** 开始对比 */
  onCompare: () => void;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({
  reports,
  selectedReports,
  compareType,
  selectedDimensions,
  comparing,
  onToggleReport,
  onSelectAll,
  onSetCompareType,
  onSetDimensions,
  onCompare,
}) => {
  // 切换维度选择
  const toggleDimension = (dimId: CompareDimension) => {
    onSetDimensions(
      safeSelectedDimensions.includes(dimId)
        ? safeSelectedDimensions.filter(d => d !== dimId)
        : [...safeSelectedDimensions, dimId]
    );
  };

  // 全选维度
  const selectAllDimensions = () => {
    const availableDims = DIMENSION_LIST.filter(d => d.scenes.includes(compareType));
    onSetDimensions(availableDims.map(d => d.id));
  };

  // 确保 selectedDimensions 是数组
  const safeSelectedDimensions = selectedDimensions || [];

  // 清空维度
  const clearDimensions = () => {
    onSetDimensions([]);
  };

  // 恢复推荐维度
  const restoreDefaultDimensions = () => {
    onSetDimensions(SCENE_DIMENSIONS[compareType]);
  };

  // 获取当前场景可用的维度
  const availableDimensions = DIMENSION_LIST.filter(d => d.scenes.includes(compareType));

  // 已选研报数量
  const selectedCount = (selectedReports || []).length;

  return (
    <div className="h-full flex flex-col">
      {/* 模式与类型区 */}
      <div className="section-block">
        <div className="section-kicker">对比维度</div>
        <div className="flex gap-2 items-center">
          <select
            className="toolbar-select flex-1"
            value={compareType}
            onChange={e => onSetCompareType(e.target.value as 'company' | 'industry' | 'custom')}
          >
            <option value="company">公司对比</option>
            <option value="industry">行业对比</option>
            <option value="custom">自定义对比</option>
          </select>
          <Button
            type="primary"
            onClick={onCompare}
            loading={comparing}
            disabled={selectedCount < 2}
            style={{
              background: 'linear-gradient(135deg, var(--blue-4), var(--blue-5))',
              borderRadius: '10px',
              height: '32px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {comparing ? '分析中...' : '开始对比'}
          </Button>
        </div>
      </div>

      {/* 维度选择区 */}
      <div className="section-block">
        <div className="flex items-center justify-between mb-2">
          <div className="section-kicker mb-0">分析维度</div>
          <div className="flex gap-1">
            <button
              onClick={selectAllDimensions}
              className="text-[10px] px-2 py-1 rounded text-[var(--text-soft)] hover:text-[var(--blue-4)] hover:bg-[var(--blue-1)] transition-colors"
            >
              全选
            </button>
            <button
              onClick={clearDimensions}
              className="text-[10px] px-2 py-1 rounded text-[var(--text-soft)] hover:text-[var(--blue-4)] hover:bg-[var(--blue-1)] transition-colors"
            >
              清空
            </button>
            <button
              onClick={restoreDefaultDimensions}
              className="text-[10px] px-2 py-1 rounded text-[var(--text-soft)] hover:text-[var(--blue-4)] hover:bg-[var(--blue-1)] transition-colors"
            >
              推荐
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {availableDimensions.map((dim: DimensionMeta) => (
            <label
              key={dim.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                safeSelectedDimensions.includes(dim.id)
                  ? 'bg-[var(--blue-1)] border border-[var(--blue-4)]'
                  : 'bg-transparent border border-[var(--line)] hover:border-[var(--blue-3)]'
              }`}
              style={{ fontSize: '13px' }}
            >
              <input
                type="checkbox"
                checked={safeSelectedDimensions.includes(dim.id)}
                onChange={() => toggleDimension(dim.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{dim.label}</div>
                <div className="text-[11px] text-[var(--text-faint)] truncate">{dim.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 已选样本概览区 */}
      <div className="section-block">
        <div className="section-kicker">已选研报</div>
        <p className="section-copy text-xs">
          {selectedCount >= 2 ? (
            <span className="text-[var(--green)]">
              当前已选 {selectedCount} 份研报，可直接执行
              {compareType === 'company' ? '公司' : compareType === 'industry' ? '行业' : '自定义'}
              对比。
            </span>
          ) : (
            <span className="text-[var(--orange)]">
              请至少选择 2 份已完成研报进行对比分析（当前已选 {selectedCount} 份）。
            </span>
          )}
        </p>
        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(reports || [])
              .filter(r => (selectedReports || []).includes(r.id))
              .map(r => (
                <span
                  key={r.id}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    background: 'var(--blue-1)',
                    color: 'var(--blue-5)',
                    border: '1px solid var(--blue-2)',
                  }}
                >
                  {r.company}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* 研报选择列表 */}
      <div className="flex-1 overflow-auto mt-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] text-[var(--text-faint)]">
            共 {(reports || []).length} 份已完成研报
          </span>
          <button
            onClick={onSelectAll}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--blue-5)] bg-gradient-to-r from-white to-[#edf6ff] hover:border-[var(--blue-3)] transition-colors"
          >
            全选研报
          </button>
        </div>

        {(reports || []).length === 0 ? (
          <EmptyState
            icon={<InboxOutlined />}
            title="暂无可对比研报"
            description="请先完成至少2份研报解析"
            minHeight={200}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(reports || []).map(r => (
              <label
                key={r.id}
                className={`selector-item ${(selectedReports || []).includes(r.id) ? 'selected' : ''}`}
                onClick={() => onToggleReport(r.id)}
              >
                <input
                  type="checkbox"
                  checked={(selectedReports || []).includes(r.id)}
                  onChange={() => {}}
                  style={{ marginTop: '2px' }}
                />
                <div className="min-w-0">
                  <div className="report-title truncate mb-1">{r.title}</div>
                  <div className="report-desc">{r.company} · {r.broker}</div>
                  <div className="report-desc">评级 {r.rating}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePanel;
