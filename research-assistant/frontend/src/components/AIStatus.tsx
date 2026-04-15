import { useState, useEffect } from 'react';
import { Badge, Tooltip, Spin } from 'antd';
import { CheckCircleOutlined, DisconnectOutlined, RobotOutlined } from '@ant-design/icons';
import { aiApi } from '../services/api';
import { colors, gradients, shadows, borderRadius } from '../styles/fintech-theme';

interface AIStatusState {
  connected: boolean;
  message: string;
  model: string | null;
  loading: boolean;
}

export default function AIStatus() {
  const [status, setStatus] = useState<AIStatusState>({
    connected: false,
    message: '检查中...',
    model: null,
    loading: true,
  });

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      const data = await aiApi.checkStatus();
      setStatus({
        connected: data.connected,
        message: data.message,
        model: data.model,
        loading: false,
      });
    } catch (error) {
      setStatus({
        connected: false,
        message: '检查失败',
        model: null,
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkStatus();
    // 每30秒自动刷新一次状态
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const tooltipContent = (
    <div style={{ fontSize: '13px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px', color: colors.textPrimary }}>AI服务状态</div>
      <div style={{ color: colors.textSecondary }}>服务: 百炼API</div>
      <div style={{ color: colors.textSecondary }}>状态: {status.connected ? '已连接' : '未连接'}</div>
      {status.model && <div style={{ color: colors.textSecondary }}>模型: {status.model}</div>}
      <div style={{ color: colors.textMuted, marginTop: '4px', fontSize: '12px' }}>{status.message}</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="bottomRight">
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: borderRadius.full,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
        onClick={checkStatus}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <RobotOutlined style={{ fontSize: '14px', color: 'rgba(212, 175, 55, 0.9)' }} />
        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>AI状态</span>
        {status.loading ? (
          <Spin size="small" style={{ color: '#fff' }} />
        ) : status.connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.successLight,
              boxShadow: `0 0 8px ${colors.successLight}`,
            }} />
            <span style={{ fontSize: '12px', color: colors.successLight, fontWeight: 500 }}>在线</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.dangerLight,
              boxShadow: `0 0 8px ${colors.dangerLight}`,
            }} />
            <span style={{ fontSize: '12px', color: colors.dangerLight, fontWeight: 500 }}>离线</span>
          </div>
        )}
      </div>
    </Tooltip>
  );
}
