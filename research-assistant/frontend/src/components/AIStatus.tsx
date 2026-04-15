import { useState, useEffect } from 'react';
import { aiApi } from '../services/api';

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
    } catch {
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
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-cluster">
      <div className="status-pill" onClick={checkStatus} style={{ cursor: 'pointer' }}>
        <span className={`dot ${!status.connected && !status.loading ? 'offline' : ''}`} />
        {status.loading
          ? 'AI状态 检查中...'
          : status.connected
            ? `AI状态 在线 · 百炼API${status.model ? ` · ${status.model}` : ''}`
            : 'AI状态 离线'
        }
      </div>
    </div>
  );
}
