"""
存储层基类
"""
import json
import os
from typing import Any, Dict, List, Optional
from datetime import datetime


class JSONStorage:
    """JSON文件存储基类"""
    
    def __init__(self, data_dir: str, filename: str):
        self.data_dir = data_dir
        self.filepath = os.path.join(data_dir, filename)
        self._ensure_data_dir()
        self._ensure_file()
    
    def _ensure_data_dir(self):
        """确保数据目录存在"""
        os.makedirs(self.data_dir, exist_ok=True)
    
    def _ensure_file(self):
        """确保文件存在"""
        if not os.path.exists(self.filepath):
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
    
    def _read_all(self) -> List[Dict]:
        """读取所有数据"""
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _write_all(self, data: List[Dict]):
        """写入所有数据"""
        with open(self.filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _now(self) -> str:
        """获取当前时间"""
        return datetime.now().isoformat()
