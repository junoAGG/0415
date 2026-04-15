import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { FileTextOutlined, BarChartOutlined, SettingOutlined, LineChartOutlined } from '@ant-design/icons';
import ReportList from './pages/ReportList';
import Analysis from './pages/Analysis';
import AIStatus from './components/AIStatus';
import { colors, gradients, shadows, borderRadius } from './styles/fintech-theme';
import './App.css';

const { Header, Content } = Layout;

function App() {
  const [currentPage, setCurrentPage] = useState<'reports' | 'analysis' | 'settings'>('reports');

  const renderContent = () => {
    switch (currentPage) {
      case 'reports':
        return <ReportList />;
      case 'analysis':
        return <Analysis />;
      case 'settings':
        return <div className="p-6"><h2 className="text-2xl font-bold">设置</h2><p className="mt-4 text-gray-500">设置功能开发中...</p></div>;
      default:
        return <ReportList />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100vw', maxWidth: '100%' }}>
      {/* 顶部Header：金融科技专业风格 */}
      <Header style={{ 
        background: gradients.header,
        padding: '0 32px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        boxShadow: shadows.lg,
        width: '100%',
        height: '64px',
        position: 'fixed',
        top: 0,
        zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
          {/* Logo区域 - 简洁专业风格 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            cursor: 'pointer',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: gradients.accent,
              borderRadius: borderRadius.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: shadows.glow,
            }}>
              <LineChartOutlined style={{ fontSize: '18px', color: colors.textPrimary }} />
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 600, 
              whiteSpace: 'nowrap',
              color: '#fff',
              letterSpacing: '0.5px',
            }}>投研助手</h1>
          </div>
          
          {/* 导航菜单 */}
          <Menu
            mode="horizontal"
            selectedKeys={[currentPage]}
            onClick={({ key }) => setCurrentPage(key as any)}
            style={{ 
              background: 'transparent',
              borderBottom: 'none',
              minWidth: '300px',
            }}
            theme="dark"
            items={[
              {
                key: 'reports',
                icon: <FileTextOutlined />,
                label: '研报管理',
              },
              {
                key: 'analysis',
                icon: <BarChartOutlined />,
                label: '智能分析',
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: '系统设置',
              },
            ]}
          />
        </div>
        <AIStatus />
      </Header>
      
      {/* 主内容区 */}
      <Content style={{ 
        marginTop: '64px', 
        height: 'calc(100vh - 64px)', 
        overflow: 'auto',
        background: colors.background,
      }}>
        {renderContent()}
      </Content>
    </Layout>
  );
}

export default App
