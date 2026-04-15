"""
会话存储，管理AI对话会话和消息
"""
import os
from typing import Dict, List, Optional
from .base import JSONStorage


class ChatStorage(JSONStorage):
    """会话存储，管理AI对话会话和消息"""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        super().__init__(data_dir, 'chat_sessions.json')
    
    def create_session(self, title: str = '新对话', report_ids: List[str] = None) -> Dict:
        """创建新会话"""
        sessions = self._read_all()
        
        session = {
            'id': self._generate_id(),
            'title': title or '新对话',
            'report_ids': report_ids or [],
            'messages': [],
            'created_at': self._now(),
            'updated_at': self._now(),
        }
        
        sessions.append(session)
        self._write_all(sessions)
        return session
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """根据ID获取会话详情（包含所有消息）"""
        sessions = self._read_all()
        for session in sessions:
            if session['id'] == session_id:
                return session
        return None
    
    def list_sessions(self) -> List[Dict]:
        """获取所有会话列表（不包含完整消息，只返回摘要信息）"""
        sessions = self._read_all()
        
        # 按更新时间倒序排列
        sessions.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        
        result = []
        for session in sessions:
            result.append({
                'id': session['id'],
                'title': session['title'],
                'message_count': len(session.get('messages', [])),
                'created_at': session['created_at'],
                'updated_at': session['updated_at'],
            })
        return result
    
    def add_message(self, session_id: str, role: str, content: str, sources: List = None) -> Optional[Dict]:
        """向指定会话添加一条消息
        
        Args:
            session_id: 会话ID
            role: 消息角色，'user' 或 'assistant'
            content: 消息内容
            sources: 参考来源列表
            
        Returns:
            添加的消息字典，会话不存在时返回 None
        """
        sessions = self._read_all()
        
        for i, session in enumerate(sessions):
            if session['id'] == session_id:
                message = {
                    'id': self._generate_id(),
                    'role': role,
                    'content': content,
                    'sources': sources or [],
                    'timestamp': self._now(),
                }
                
                sessions[i].setdefault('messages', []).append(message)
                sessions[i]['updated_at'] = self._now()
                self._write_all(sessions)
                return message
        
        return None
    
    def update_session(self, session_id: str, title: str = None) -> Optional[Dict]:
        """更新会话信息（目前支持修改标题）"""
        sessions = self._read_all()
        
        for i, session in enumerate(sessions):
            if session['id'] == session_id:
                if title:
                    sessions[i]['title'] = title
                sessions[i]['updated_at'] = self._now()
                self._write_all(sessions)
                return {
                    'id': sessions[i]['id'],
                    'title': sessions[i]['title'],
                    'message_count': len(sessions[i].get('messages', [])),
                    'created_at': sessions[i]['created_at'],
                    'updated_at': sessions[i]['updated_at'],
                }
        
        return None
    
    def delete_session(self, session_id: str) -> bool:
        """删除指定会话"""
        sessions = self._read_all()
        
        for i, session in enumerate(sessions):
            if session['id'] == session_id:
                sessions.pop(i)
                self._write_all(sessions)
                return True
        
        return False
