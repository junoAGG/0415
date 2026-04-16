/**
 * 对比结果展示组件
 * 中栏：卡片化展示摘要、共识/差异双列、建议、维度Accordion
 */
import React, { useState, useMemo } from 'react';
import { Statistic, Collapse, Button, Dropdown, Row, Col, Tooltip, message } from 'antd';
import type { Report } from '../../types';
import type { CompareResponse, CompareDimension, ExportFormat } from '../../types/analysis';
import { DIMENSION_LIST } from '../../types/analysis';
import { CompareResultSkeleton } from '../common/SkeletonBlock';
import {
  DownloadOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BulbOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface CompareResultProps {
  /** 对比结果数据 */
  result: CompareResponse | null;
  /** 已选研报 */
  selectedReports: Report[];
  /** 对比类型 */
  compareType: 'company' | 'industry' | 'custom';
  /** 已选维度 */
  selectedDimensions: CompareDimension[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 导出回调 */
  onExport?: (format: ExportFormat) => void;
}

export const CompareResult: React.FC<CompareResultProps> = ({
  result,
  selectedReports,
  compareType,
  selectedDimensions,
  loading = false,
  onExport,
}) => {
  // 默认展开前2个维度
  const [activeKeys, setActiveKeys] = useState<string[]>(() => {
    if (result?.dimension_results && Array.isArray(result.dimension_results)) {
      return result.dimension_results.slice(0, 2).map((_, i) => i.toString());
    }
    return [];
  });

  // 获取公司标题
  const titles = useMemo(() => {
    return (selectedReports || []).map(r => r.company).join(' / ');
  }, [selectedReports]);

  // 计算统计数据
  const stats = useMemo(() => {
    if (!result) return null;
    return {
      dimensions: (selectedDimensions || []).length,
      similarities: (result.similarities || []).length,
      differences: (result.differences || []).length,
      recommendations: (result.recommendations || []).length,
    };
  }, [result, selectedDimensions]);

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'markdown',
      icon: <FileMarkdownOutlined />,
      label: '导出为 Markdown',
      onClick: () => onExport?.('markdown'),
    },
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: '导出为 JSON',
      onClick: () => onExport?.('json'),
    },
    {
      key: 'csv',
      icon: <BarChartOutlined />,
      label: '导出为 CSV',
      onClick: () => onExport?.('csv'),
    },
  ];

  // 复制到剪贴板
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  // 生成 Markdown 内容（用于前端降级导出）
  // @ts-expect-error - 保留供将来使用
  const generateMarkdown = (): string => {
    if (!result) return '';
    const safeSelectedReports = selectedReports || [];
    const safeSelectedDimensions = selectedDimensions || [];
    const lines: string[] = [
      `# ${titles} 对比分析`,
      '',
      `**对比类型**：${compareType === 'company' ? '公司对比' : compareType === 'industry' ? '行业对比' : '自定义对比'}`,
      `**样本数量**：${safeSelectedReports.length} 份研报`,
      `**分析维度**：${safeSelectedDimensions.map(d => DIMENSION_LIST.find(dim => dim.id === d)?.label || d).join('、')}`,
      '',
      '## 核心结论',
      '',
      result.comparison_result || '',
      '',
    ];

    if ((result.similarities || []).length) {
      lines.push('## 共同点', '');
      (result.similarities || []).forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    if ((result.differences || []).length) {
      lines.push('## 差异点', '');
      (result.differences || []).forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    if ((result.recommendations || []).length) {
      lines.push('## 投资建议', '');
      (result.recommendations || []).forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    if ((result.dimension_results || []).length) {
      lines.push('## 维度详细分析', '');
      (result.dimension_results || []).forEach(dr => {
        lines.push(`### ${dr.dimension_label || ''}`, '');
        if (dr.summary) lines.push(dr.summary, '');
        (dr.details || []).forEach(d => lines.push(`- ${d}`));
        lines.push('');
      });
    }

    lines.push('## 来源研报', '');
    safeSelectedReports.forEach(r => {
      lines.push(`- ${r.title || ''}（${r.broker || ''}，评级：${r.rating || ''}）`);
    });

    return lines.join('\n');
  };

  // 前端降级导出（已合并到 handleExport 中）
  // const handleLocalExport = (format: ExportFormat) => { ... };

  if (loading) {
    return (
      <div className="h-full overflow-auto p-4">
        <CompareResultSkeleton />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="detail-wrap">
      {/* 顶部 Hero + 操作栏 */}
      <div className="detail-hero">
        <div className="flex items-center justify-between mb-2">
          <div className="section-kicker mb-0">Compare Result</div>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button
              icon={<DownloadOutlined />}
              style={{
                borderRadius: '10px',
                borderColor: 'var(--line)',
                background: 'linear-gradient(135deg, #ffffff, #edf6ff)',
              }}
            >
              导出
            </Button>
          </Dropdown>
        </div>
        <h2 className="detail-title">{titles} 对比分析</h2>
        <div className="report-desc">
          对比维度：{compareType === 'company' ? '公司对比' : compareType === 'industry' ? '行业对比' : '自定义对比'} · 样本 {(selectedReports || []).length} 份
        </div>
      </div>

      {/* 结果内容区 */}
      <div className="tab-panel" style={{ display: 'block', height: 'calc(100% - 130px)', overflow: 'auto' }}>
        {/* KPI 卡片行 */}
        {stats && (
          <Row gutter={12} className="mb-4">
            <Col span={6}>
              <div className="p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]">
                <Statistic
                  title="分析维度"
                  value={stats.dimensions}
                  valueStyle={{ color: 'var(--blue-4)', fontSize: '18px', fontWeight: 700 }}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]">
                <Statistic
                  title="共识数"
                  value={stats.similarities}
                  valueStyle={{ color: 'var(--green)', fontSize: '18px', fontWeight: 700 }}
                  prefix={<CheckCircleOutlined className="mr-1" />}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]">
                <Statistic
                  title="差异数"
                  value={stats.differences}
                  valueStyle={{ color: 'var(--orange)', fontSize: '18px', fontWeight: 700 }}
                  prefix={<ExclamationCircleOutlined className="mr-1" />}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="p-3 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)]">
                <Statistic
                  title="建议数"
                  value={stats.recommendations}
                  valueStyle={{ color: 'var(--gold-3)', fontSize: '18px', fontWeight: 700 }}
                  prefix={<BulbOutlined className="mr-1" />}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* 核心结论 */}
        <div className="brief-box mb-3">
          <div className="section-kicker">分析总结</div>
          <h4 className="text-sm font-bold mb-2">核心结论</h4>
          <p className="section-copy">{result.comparison_result}</p>
        </div>

        {/* 共识/差异双列卡片 */}
        <Row gutter={12} className="mb-3">
          <Col span={12}>
            <div className="compare-box h-full" style={{ borderLeft: '4px solid var(--green)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="flex items-center gap-2 m-0">
                  <CheckCircleOutlined style={{ color: 'var(--green)' }} />
                  共同点
                </h4>
                <Tooltip title="复制内容">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy((result.similarities || []).join('\n'))}
                  />
                </Tooltip>
              </div>
              <ul className="bullet-list">
                {(result.similarities || []).map((item, i) => <li key={i}>{item || ''}</li>)}
              </ul>
            </div>
          </Col>
          <Col span={12}>
            <div className="compare-box h-full" style={{ borderLeft: '4px solid var(--gold-2)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="flex items-center gap-2 m-0">
                  <ExclamationCircleOutlined style={{ color: 'var(--gold-3)' }} />
                  差异点
                </h4>
                <Tooltip title="复制内容">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy((result.differences || []).join('\n'))}
                  />
                </Tooltip>
              </div>
              <ul className="bullet-list">
                {(result.differences || []).map((item, i) => <li key={i}>{item || ''}</li>)}
              </ul>
            </div>
          </Col>
        </Row>

        {/* 投资建议独立高亮卡片 */}
        {result.recommendations && Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
          <div
            className="mb-4 p-4 rounded-[14px] border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(24,59,112,0.03), rgba(244,207,115,0.05))',
              borderColor: 'var(--gold-2)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="flex items-center gap-2 m-0 text-[var(--blue-5)]">
                <BulbOutlined style={{ color: 'var(--gold-3)' }} />
                投资建议
              </h4>
              <Tooltip title="复制内容">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy((result.recommendations || []).join('\n'))}
                />
              </Tooltip>
            </div>
            <ul className="bullet-list">
              {(result.recommendations || []).map((item, i) => (
                <li key={i} className="font-medium">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 维度分析 Accordion */}
        {result.dimension_results && Array.isArray(result.dimension_results) && result.dimension_results.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="section-kicker mb-0">维度详细分析</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveKeys((result.dimension_results || []).map((_, i) => i.toString()))}
                  className="text-[11px] px-2 py-1 rounded text-[var(--text-soft)] hover:text-[var(--blue-4)] hover:bg-[var(--blue-1)] transition-colors"
                >
                  全部展开
                </button>
                <button
                  onClick={() => setActiveKeys([])}
                  className="text-[11px] px-2 py-1 rounded text-[var(--text-soft)] hover:text-[var(--blue-4)] hover:bg-[var(--blue-1)] transition-colors"
                >
                  全部收起
                </button>
              </div>
            </div>
            <Collapse
              activeKey={activeKeys}
              onChange={keys => setActiveKeys(Array.isArray(keys) ? keys : [keys])}
              bordered={false}
              style={{ background: 'transparent' }}
            >
              {(result.dimension_results || []).map((dr, i) => (
                <Collapse.Panel
                  key={i.toString()}
                  header={
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-medium text-white"
                        style={{ background: 'var(--blue-4)' }}
                      >
                        {dr.dimension_label}
                      </span>
                      <span className="text-[var(--text-faint)] text-xs">
                        {(dr.details || []).length} 条分析
                      </span>
                    </div>
                  }
                  className="mb-2 rounded-[12px] border border-[var(--line)] bg-gradient-to-b from-white to-[rgba(247,251,255,0.96)] overflow-hidden"
                >
                  {dr.summary && (
                    <p className="text-[var(--text-soft)] text-sm mb-3 leading-relaxed">{dr.summary}</p>
                  )}
                  <ul className="bullet-list">
                    {(dr.details || []).map((d, j) => <li key={j}>{d}</li>)}
                  </ul>
                </Collapse.Panel>
              ))}
            </Collapse>
          </div>
        )}

        {/* 来源研报 */}
        <div className="source-list">
          <div className="section-kicker mb-2">来源研报</div>
          {(selectedReports || []).map(r => (
            <div className="source-item" key={r.id}>
              <h4 className="text-sm font-bold">{r.company} · {r.rating}</h4>
              <div className="report-desc">{r.core_views?.split('\n')[0] || '-'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompareResult;
