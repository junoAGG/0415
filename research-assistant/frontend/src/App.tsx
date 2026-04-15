import { useState, useEffect } from 'react';
import ReportList from './pages/ReportList';
import Analysis from './pages/Analysis';
import AIStatus from './components/AIStatus';
import StockPanel from './components/StockPanel';
import { reportApi } from './services/api';
import type { Report } from './types';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState<'reportsPage' | 'analysisPage'>('reportsPage');
  const [reports, setReports] = useState<Report[]>([]);
  const [stockPanelVisible, setStockPanelVisible] = useState(false);
  const [stockPanelCode, setStockPanelCode] = useState('');

  const openStockPanel = (code?: string) => {
    if (code) setStockPanelCode(code);
    setStockPanelVisible(true);
  };

  // 加载研报用于顶部统计
  const loadReports = async () => {
    try {
      const res = await reportApi.list({ page_size: 100 });
      setReports(res.items);
    } catch {
      // 静默处理
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // 计算摘要指标
  const total = reports.length;
  const completed = reports.filter(r => r.status === 'completed').length;
  const positiveRatings = ['买入', '增持', '推荐', '谨慎增持'];
  const positive = reports.filter(r => positiveRatings.includes(r.rating)).length;
  const positiveRatio = total > 0 ? ((positive / total) * 100).toFixed(0) + '%' : '0%';
  const upsides = reports
    .filter(r => r.target_price && r.current_price)
    .map(r => ((r.target_price! - r.current_price!) / r.current_price!) * 100);
  const avgUpside = upsides.length > 0
    ? (upsides.reduce((a, b) => a + b, 0) / upsides.length).toFixed(1) + '%'
    : '0%';
  const industryCount: Record<string, number> = {};
  reports.forEach(r => {
    const ind = (r as any).industry || '未知';
    industryCount[ind] = (industryCount[ind] || 0) + 1;
  });
  const topIndustry = Object.entries(industryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  const renderContent = () => {
    switch (currentPage) {
      case 'reportsPage':
        return <ReportList onDataChange={loadReports} onOpenStockPanel={openStockPanel} />;
      case 'analysisPage':
        return <Analysis />;
      default:
        return <ReportList onDataChange={loadReports} onOpenStockPanel={openStockPanel} />;
    }
  };

  return (
    <div className="app-shell">
      <div className="shell-card">
        {/* 顶部导航栏 */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="brand">
              <div className="brand-mark" />
              <div className="brand-copy">
                <h1>智能研报</h1>
                <p>AI驱动的投研工作台</p>
              </div>
            </div>
            <nav className="nav-tabs">
              <button
                className={`nav-tab ${currentPage === 'reportsPage' ? 'active' : ''}`}
                onClick={() => setCurrentPage('reportsPage')}
              >
                研报管理
              </button>
              <button
                className={`nav-tab ${currentPage === 'analysisPage' ? 'active' : ''}`}
                onClick={() => setCurrentPage('analysisPage')}
              >
                智能分析
              </button>
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="nav-tab"
              onClick={() => setStockPanelVisible(true)}
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              股票数据
            </button>
            <AIStatus />
          </div>
        </header>

        {/* 主内容区 */}
        <main className="main-content">
          {/* 摘要指标条 */}
          <section className="summary-strip">
            <div className="metric-card">
              <div className="metric-label">在库研报</div>
              <div className="metric-value">{total}</div>
              <div className="metric-sub">含自动抓取与手工上传，支持状态追踪</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">已完成解析</div>
              <div className="metric-value">{completed}</div>
              <div className="metric-sub">可直接进入对比分析与问答链路</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">买入/增持占比</div>
              <div className="metric-value">{positiveRatio}</div>
              <div className="metric-sub">反映当前样本中主流卖方态度</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">平均目标涨幅</div>
              <div className="metric-value">{avgUpside}</div>
              <div className="metric-sub">基于目标价与现价计算的样本均值</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">关注行业</div>
              <div className="metric-value">{topIndustry}</div>
              <div className="metric-sub">根据样本覆盖频次自动聚合</div>
            </div>
          </section>

          {/* 页面内容 */}
          <div className="page-enter" key={currentPage}>
            {renderContent()}
          </div>
        </main>
      </div>

      {/* 股票数据抽屉面板 */}
      <StockPanel
        visible={stockPanelVisible}
        onClose={() => setStockPanelVisible(false)}
        initialStockCode={stockPanelCode}
      />
    </div>
  );
}

export default App;
