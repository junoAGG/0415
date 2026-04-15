"""
AI服务 - 百炼API集成
提供AI能力检测和文本生成功能
"""
import os
import requests
from typing import Dict, Optional


class AIService:
    """百炼AI服务"""
    
    def __init__(self):
        self.api_key = os.getenv('BAILIAN_API_KEY', '')
        self.api_url = os.getenv('BAILIAN_API_URL', 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation')
        self._status_cache = None
    
    def check_status(self) -> Dict:
        """
        检查AI服务连接状态
        
        Returns:
            {
                'connected': bool,
                'message': str,
                'model': str
            }
        """
        if not self.api_key:
            return {
                'connected': False,
                'message': 'API密钥未配置',
                'model': None
            }
        
        try:
            # 发送一个简单的测试请求
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': 'qwen-turbo',
                'input': {
                    'messages': [
                        {'role': 'user', 'content': '你好'}
                    ]
                },
                'parameters': {
                    'max_tokens': 10
                }
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'output' in data or 'text' in str(data):
                    return {
                        'connected': True,
                        'message': '连接成功',
                        'model': 'qwen-turbo'
                    }
            
            return {
                'connected': False,
                'message': f'API返回错误: {response.status_code}',
                'model': None
            }
            
        except requests.exceptions.Timeout:
            return {
                'connected': False,
                'message': '连接超时',
                'model': None
            }
        except requests.exceptions.ConnectionError:
            return {
                'connected': False,
                'message': '网络连接失败',
                'model': None
            }
        except Exception as e:
            return {
                'connected': False,
                'message': f'连接异常: {str(e)}',
                'model': None
            }
    
    def generate_text(self, prompt: str, max_tokens: int = 2000) -> Dict:
        """
        使用百炼API生成文本
        
        Args:
            prompt: 提示词
            max_tokens: 最大token数
            
        Returns:
            {
                'success': bool,
                'text': str,
                'error': str
            }
        """
        if not self.api_key:
            return {
                'success': False,
                'text': '',
                'error': 'API密钥未配置'
            }
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': 'qwen-turbo',
                'input': {
                    'messages': [
                        {'role': 'user', 'content': prompt}
                    ]
                },
                'parameters': {
                    'max_tokens': max_tokens,
                    'temperature': 0.7
                }
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                # 解析响应
                text = ''
                if 'output' in data:
                    if 'text' in data['output']:
                        text = data['output']['text']
                    elif 'choices' in data['output']:
                        text = data['output']['choices'][0]['message']['content']
                
                return {
                    'success': True,
                    'text': text,
                    'error': ''
                }
            else:
                return {
                    'success': False,
                    'text': '',
                    'error': f'API错误: {response.status_code}, {response.text}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'text': '',
                'error': str(e)
            }


# 全局AI服务实例
ai_service = AIService()
