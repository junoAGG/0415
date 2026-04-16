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
    
    def create_session(self, title: str = '新对话', report_ids: List[str] = None, tags: List[str] = None) -> Dict:
        """创建新会话
        
        Args:
            title: 会话标题
            report_ids: 关联研报ID列表
            tags: 会话标签列表
            
        Returns:
            创建成功的会话字典
        """
        sessions = self._read_all()
        
        session = {
            'id': self._generate_id(),
            'title': title or '新对话',
            'report_ids': report_ids or [],
            'tags': tags or [],
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
    
    def list_sessions(self, page: int = 1, page_size: int = 20, 
                      search: str = None, tags: List[str] = None) -> Dict:
        """获取会话列表（支持分页、搜索、标签过滤）
        
        Args:
            page: 页码，从1开始
            page_size: 每页数量
            search: 搜索关键词（搜索标题）
            tags: 标签过滤列表
            
        Returns:
            {
                'items': 会话列表（不包含完整消息）,
                'total': 总数,
                'page': 当前页码,
                'page_size': 每页数量,
                'total_pages': 总页数
            }
        """
        sessions = self._read_all()
        
        # 过滤
        filtered_sessions = sessions
        
        # 搜索过滤
        if search:
            search_lower = search.lower()
            filtered_sessions = [
                s for s in filtered_sessions 
                if search_lower in s.get('title', '').lower()
            ]
        
        # 标签过滤
        if tags:
            filtered_sessions = [
                s for s in filtered_sessions
                if any(tag in s.get('tags', []) for tag in tags)
            ]
        
        # 按更新时间倒序排列
        filtered_sessions.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        
        # 计算分页
        total = len(filtered_sessions)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        
        # 页码边界处理
        if page < 1:
            page = 1
        if page > total_pages and total_pages > 0:
            page = total_pages
        
        # 分页切片
        start = (page - 1) * page_size
        end = start + page_size
        paginated_sessions = filtered_sessions[start:end]
        
        # 构建结果
        items = []
        for session in paginated_sessions:
            items.append({
                'id': session['id'],
                'title': session['title'],
                'tags': session.get('tags', []),
                'message_count': len(session.get('messages', [])),
                'created_at': session['created_at'],
                'updated_at': session['updated_at'],
            })
        
        return {
            'items': items,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages
        }
    
    def search_sessions(self, keyword: str) -> List[Dict]:
        """搜索会话（按标题搜索）
        
        Args:
            keyword: 搜索关键词
            
        Returns:
            匹配的会话列表（不包含完整消息）
        """
        if not keyword:
            return []
        
        sessions = self._read_all()
        keyword_lower = keyword.lower()
        
        result = []
        for session in sessions:
            if keyword_lower in session.get('title', '').lower():
                result.append({
                    'id': session['id'],
                    'title': session['title'],
                    'tags': session.get('tags', []),
                    'message_count': len(session.get('messages', [])),
                    'created_at': session['created_at'],
                    'updated_at': session['updated_at'],
                })
        
        # 按更新时间倒序排列
        result.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
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
    
    def update_session(self, session_id: str, title: str = None, tags: List[str] = None) -> Optional[Dict]:
        """更新会话信息
        
        Args:
            session_id: 会话ID
            title: 新标题（可选）
            tags: 新标签列表（可选）
            
        Returns:
            更新后的会话摘要，不存在时返回 None
        """
        sessions = self._read_all()
        
        for i, session in enumerate(sessions):
            if session['id'] == session_id:
                if title is not None:
                    sessions[i]['title'] = title
                if tags is not None:
                    sessions[i]['tags'] = tags
                sessions[i]['updated_at'] = self._now()
                self._write_all(sessions)
                return {
                    'id': sessions[i]['id'],
                    'title': sessions[i]['title'],
                    'tags': sessions[i].get('tags', []),
                    'message_count': len(sessions[i].get('messages', [])),
                    'created_at': sessions[i]['created_at'],
                    'updated_at': sessions[i]['updated_at'],
                }
        
        return None
    
    def update_session_tags(self, session_id: str, tags: List[str]) -> Optional[Dict]:
        """更新会话标签
        
        Args:
            session_id: 会话ID
            tags: 标签列表
            
        Returns:
            更新后的会话摘要，不存在时返回 None
        """
        return self.update_session(session_id, tags=tags)
    
    def delete_session(self, session_id: str) -> bool:
        """删除指定会话"""
        sessions = self._read_all()
        
        for i, session in enumerate(sessions):
            if session['id'] == session_id:
                sessions.pop(i)
                self._write_all(sessions)
                return True
        
        return False
