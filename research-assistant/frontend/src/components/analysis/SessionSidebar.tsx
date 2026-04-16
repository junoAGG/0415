/**
 * 会话管理侧边栏
 * 会话列表 + 搜索 + 新建
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Button, Dropdown, Empty, message, Modal } from 'antd';
import type { ChatSession } from '../../types/analysis';
import { SkeletonList } from '../common/SkeletonBlock';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface SessionSidebarProps {
  /** 会话列表 */
  sessions: ChatSession[];
  /** 当前会话ID */
  currentSessionId: string | null;
  /** 是否正在加载 */
  loading?: boolean;
  /** 新建会话回调 */
  onNewSession: () => void;
  /** 切换会话回调 */
  onSwitchSession: (sessionId: string) => void;
  /** 删除会话回调 */
  onDeleteSession: (sessionId: string) => void;
  /** 重命名会话回调 */
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  /** 添加标签回调 */
  onAddTag?: (sessionId: string, tag: string) => void;
  /** 切换模式回调 */
  onSwitchMode?: (mode: 'compare' | 'qa') => void;
}

// 会话分组类型
type SessionGroup = 'today' | 'week' | 'earlier';

interface GroupedSession {
  type: SessionGroup;
  label: string;
  icon: React.ReactNode;
  sessions: ChatSession[];
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  loading = false,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  onAddTag,
  onSwitchMode,
}) => {
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');
  // 防抖后的搜索词
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // 重命名对话框
  const [renameModal, setRenameModal] = useState<{ visible: boolean; sessionId: string | null; title: string }>({
    visible: false,
    sessionId: null,
    title: '',
  });

  // 300ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 过滤会话
  const filteredSessions = useMemo(() => {
    const safeSessions = sessions || [];
    if (!debouncedQuery.trim()) return safeSessions;
    const query = debouncedQuery.toLowerCase();
    return safeSessions.filter(s =>
      (s.title || '').toLowerCase().includes(query) ||
      (s.messages || []).some(m => (m.content || '').toLowerCase().includes(query))
    );
  }, [sessions, debouncedQuery]);

  // 按时间分组
  const groupedSessions = useMemo((): GroupedSession[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: Record<SessionGroup, ChatSession[]> = {
      today: [],
      week: [],
      earlier: [],
    };

    // 确保 filteredSessions 是数组
    const safeFilteredSessions = filteredSessions || [];
    safeFilteredSessions.forEach(session => {
      const updatedAt = new Date(session.updated_at);
      if (updatedAt >= today) {
        groups.today.push(session);
      } else if (updatedAt >= weekAgo) {
        groups.week.push(session);
      } else {
        groups.earlier.push(session);
      }
    });

    const result: GroupedSession[] = [];
    if (groups.today.length > 0) {
      result.push({ type: 'today', label: '今天', icon: <ClockCircleOutlined />, sessions: groups.today });
    }
    if (groups.week.length > 0) {
      result.push({ type: 'week', label: '最近7天', icon: <CalendarOutlined />, sessions: groups.week });
    }
    if (groups.earlier.length > 0) {
      result.push({ type: 'earlier', label: '更早', icon: <CalendarOutlined />, sessions: groups.earlier });
    }

    return result;
  }, [filteredSessions]);

  // 处理重命名
  const handleRename = useCallback(() => {
    if (renameModal.sessionId && renameModal.title.trim() && onRenameSession) {
      onRenameSession(renameModal.sessionId, renameModal.title.trim());
      message.success('重命名成功');
    }
    setRenameModal({ visible: false, sessionId: null, title: '' });
  }, [renameModal, onRenameSession]);

  // 打开重命名对话框
  const openRenameModal = (session: ChatSession) => {
    setRenameModal({
      visible: true,
      sessionId: session.id,
      title: session.title || '',
    });
  };

  // 获取会话操作菜单
  const getSessionMenuItems = (session: ChatSession): MenuProps['items'] => [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: () => openRenameModal(session),
    },
    {
      key: 'tag',
      icon: <TagOutlined />,
      label: '添加标签',
      onClick: () => {
        // 简化版：直接添加一个示例标签
        onAddTag?.(session.id, '重要');
        message.success('标签添加成功');
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除会话 "${session.title || '新对话'}" 吗？此操作不可恢复。`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => onDeleteSession(session.id),
        });
      },
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部固定区 */}
      <div className="p-3 border-b border-[var(--line)]">
        {/* 模式切换 */}
        {onSwitchMode && (
          <div className="mode-switch mb-3">
            <button
              className="mode-btn"
              onClick={() => onSwitchMode('compare')}
            >
              研报对比
            </button>
            <button
              className="mode-btn active"
              onClick={() => onSwitchMode('qa')}
            >
              AI问答
            </button>
          </div>
        )}
        <Button
          type="primary"
          block
          icon={<PlusOutlined />}
          onClick={onNewSession}
          style={{
            background: 'linear-gradient(135deg, var(--blue-4), var(--blue-5))',
            borderRadius: '10px',
            height: '36px',
            fontWeight: 600,
          }}
        >
          新建会话
        </Button>

        {/* 搜索框 */}
        <div className="mt-3 relative">
          <Input
            prefix={<SearchOutlined className="text-[var(--text-faint)]" />}
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{
              borderRadius: '10px',
              borderColor: 'var(--line)',
              background: 'linear-gradient(180deg, #ffffff, #f7fbff)',
            }}
          />
        </div>
      </div>

      {/* 会话列表区 */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <SkeletonList count={6} />
        ) : filteredSessions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={debouncedQuery ? '未找到匹配的会话' : '暂无会话记录'}
            className="mt-8"
          />
        ) : (
          <div className="space-y-4">
            {groupedSessions.map(group => (
              <div key={group.type}>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[var(--text-faint)] font-medium">
                  {group.icon}
                  {group.label}
                  <span className="text-[10px]">({group.sessions.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {group.sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => onSwitchSession(session.id)}
                      className={`
                        group relative p-2.5 rounded-xl cursor-pointer transition-all duration-150
                        ${currentSessionId === session.id
                          ? 'bg-[var(--blue-1)] border-l-[3px] border-[var(--blue-4)]'
                          : 'bg-transparent border-l-[3px] border-transparent hover:bg-[rgba(255,255,255,0.5)]'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium truncate text-[var(--text)]">
                            {session.title || '新对话'}
                          </h4>
                          <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
                            {session.message_count || 0} 条消息 · {new Date(session.updated_at || Date.now()).toLocaleDateString('zh-CN')}
                          </div>
                        </div>

                        {/* 更多操作按钮 - hover 显示 */}
                        <Dropdown
                          menu={{ items: getSessionMenuItems(session) }}
                          placement="bottomRight"
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}
                            style={{ padding: '0 4px', height: '24px' }}
                          />
                        </Dropdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部状态区 */}
      <div className="p-3 border-t border-[var(--line)] text-[11px] text-[var(--text-faint)]">
        <div className="flex items-center justify-between">
          <span>共 {(sessions || []).length} 个会话</span>
          {debouncedQuery && (
            <span>筛选: {filteredSessions.length}</span>
          )}
        </div>
      </div>

      {/* 重命名对话框 */}
      <Modal
        title="重命名会话"
        open={renameModal.visible}
        onOk={handleRename}
        onCancel={() => setRenameModal({ visible: false, sessionId: null, title: '' })}
        okText="确认"
        cancelText="取消"
      >
        <Input
          placeholder="请输入会话名称"
          value={renameModal.title}
          onChange={e => setRenameModal(prev => ({ ...prev, title: e.target.value }))}
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default SessionSidebar;
