"""
文件存储
"""
import os
import uuid
import shutil
from typing import Optional
from werkzeug.utils import secure_filename


class FileStorage:
    """文件存储管理"""
    
    ALLOWED_EXTENSIONS = {'pdf', 'html', 'htm'}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    def __init__(self, upload_dir: str = None):
        if upload_dir is None:
            upload_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'uploads')
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def _allowed_file(self, filename: str) -> bool:
        """检查文件类型是否允许"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS
    
    def _generate_filename(self, original_filename: str) -> str:
        """生成唯一文件名"""
        ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_id = str(uuid.uuid4())[:8]
        safe_name = secure_filename(original_filename.rsplit('.', 1)[0])
        if not safe_name:
            safe_name = 'upload'
        return f"{safe_name}_{unique_id}.{ext}"
    
    def save(self, file_obj, original_filename: str) -> dict:
        """保存文件
        
        Returns:
            {
                'success': bool,
                'file_path': str,
                'file_size': int,
                'error': str
            }
        """
        # 检查文件类型
        if not self._allowed_file(original_filename):
            return {
                'success': False,
                'error': f'不支持的文件类型，仅支持: {", ".join(self.ALLOWED_EXTENSIONS)}'
            }
        
        # 检查文件大小
        file_obj.seek(0, os.SEEK_END)
        file_size = file_obj.tell()
        file_obj.seek(0)
        
        if file_size > self.MAX_FILE_SIZE:
            return {
                'success': False,
                'error': f'文件大小超过限制（最大 {self.MAX_FILE_SIZE // 1024 // 1024}MB）'
            }
        
        # 生成文件名并保存
        filename = self._generate_filename(original_filename)
        filepath = os.path.join(self.upload_dir, filename)
        
        try:
            file_obj.save(filepath)
            return {
                'success': True,
                'file_path': filepath,
                'filename': filename,
                'file_size': file_size
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'文件保存失败: {str(e)}'
            }
    
    def get(self, filename: str) -> Optional[str]:
        """获取文件路径"""
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            return filepath
        return None
    
    def delete(self, filename: str) -> bool:
        """删除文件"""
        filepath = os.path.join(self.upload_dir, filename)
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
        except Exception:
            pass
        return False
    
    def get_file_size(self, filename: str) -> int:
        """获取文件大小"""
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            return os.path.getsize(filepath)
        return 0
