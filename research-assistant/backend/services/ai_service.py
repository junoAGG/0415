"""
AI服务 - 百炼API集成
提供AI能力检测和文本生成功能
"""
import os
import json
import logging
import time
import requests
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class AIError(Exception):
    """AI服务错误基类"""
    def __init__(self, code: str, message: str, details: str = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class AIConnectionError(AIError):
    """AI连接错误"""
    def __init__(self, message: str = 'AI 服务连接失败', details: str = None):
        super().__init__('AI_CONNECTION_ERROR', message, details)


class AIAuthError(AIError):
    """AI认证错误"""
    def __init__(self, message: str = 'AI 认证失败', details: str = None):
        super().__init__('AI_AUTH_ERROR', message, details)


class AIRateLimitError(AIError):
    """AI请求频率限制错误"""
    def __init__(self, message: str = 'AI 请求过于频繁', details: str = None):
        super().__init__('AI_RATE_LIMIT', message, details)


class AITimeoutError(AIError):
    """AI请求超时错误"""
    def __init__(self, message: str = 'AI 请求超时', details: str = None):
        super().__init__('AI_TIMEOUT', message, details)


class AIServiceError(AIError):
    """AI服务端错误"""
    def __init__(self, message: str = 'AI 服务暂时不可用', details: str = None):
        super().__init__('AI_SERVICE_ERROR', message, details)


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
    
    def generate_text(self, prompt: str, max_tokens: int = 2000, timeout: int = 30) -> Dict:
        """
        使用百炼API生成文本
        
        Args:
            prompt: 提示词
            max_tokens: 最大token数
            timeout: 请求超时时间（秒），默认30秒
            
        Returns:
            {
                'success': bool,
                'text': str,
                'error': str,
                'error_code': str
            }
        """
        start_time = time.time()
        
        if not self.api_key:
            logger.error("API密钥未配置")
            return {
                'success': False,
                'text': '',
                'error': 'API密钥未配置',
                'error_code': 'AI_AUTH_ERROR'
            }
        
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
        
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                logger.info("调用百炼API生成文本，attempt=%d, prompt长度=%d, timeout=%d", 
                           attempt + 1, len(prompt), timeout)
                
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                
                elapsed_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    # 解析响应
                    text = ''
                    if 'output' in data:
                        if 'text' in data['output']:
                            text = data['output']['text']
                        elif 'choices' in data['output']:
                            choices = data['output']['choices']
                            if not choices:
                                logger.error("API返回空的choices列表")
                                return {
                                    'success': False,
                                    'text': '',
                                    'error': 'AI 未返回有效内容，请重试',
                                    'error_code': 'AI_EMPTY_RESPONSE'
                                }
                            text = choices[0]['message']['content']
                    
                    logger.info("文本生成成功，返回长度=%d, 耗时=%.2fs", len(text), elapsed_time)
                    return {
                        'success': True,
                        'text': text,
                        'error': '',
                        'elapsed_time': elapsed_time
                    }
                elif response.status_code == 429:
                    logger.error("API请求频率限制: %s", response.text)
                    return {
                        'success': False,
                        'text': '',
                        'error': 'API 请求过于频繁，请稍后重试',
                        'error_code': 'AI_RATE_LIMIT'
                    }
                elif response.status_code == 401:
                    logger.error("API认证失败: %s", response.text)
                    return {
                        'success': False,
                        'text': '',
                        'error': 'API 认证失败，请检查 API Key',
                        'error_code': 'AI_AUTH_ERROR'
                    }
                elif response.status_code >= 500:
                    logger.error("API服务端错误: %d, %s", response.status_code, response.text)
                    if attempt < max_retries:
                        logger.info("服务端错误，%d秒后重试...", 1)
                        time.sleep(1)
                        continue
                    return {
                        'success': False,
                        'text': '',
                        'error': 'AI 服务暂时不可用，请稍后重试',
                        'error_code': 'AI_SERVICE_ERROR'
                    }
                else:
                    logger.error("API未知错误: %d, %s", response.status_code, response.text)
                    return {
                        'success': False,
                        'text': '',
                        'error': f'API错误: {response.status_code}, {response.text}',
                        'error_code': 'AI_UNKNOWN_ERROR'
                    }
                    
            except requests.exceptions.Timeout as e:
                elapsed_time = time.time() - start_time
                logger.error("API请求超时: %s, attempt=%d, elapsed=%.2fs", str(e), attempt + 1, elapsed_time)
                if attempt < max_retries:
                    logger.info("请求超时，%d秒后重试...", 1)
                    time.sleep(1)
                    continue
                return {
                    'success': False,
                    'text': '',
                    'error': 'AI 请求超时，请稍后重试',
                    'error_code': 'AI_TIMEOUT'
                }
            except requests.exceptions.ConnectionError as e:
                logger.error("网络连接错误: %s, attempt=%d", str(e), attempt + 1)
                if attempt < max_retries:
                    logger.info("网络错误，%d秒后重试...", 1)
                    time.sleep(1)
                    continue
                return {
                    'success': False,
                    'text': '',
                    'error': 'AI 服务连接失败，请检查网络',
                    'error_code': 'AI_CONNECTION_ERROR'
                }
            except Exception as e:
                logger.error("生成文本异常: %s", str(e))
                return {
                    'success': False,
                    'text': '',
                    'error': str(e),
                    'error_code': 'AI_UNKNOWN_ERROR'
                }
        
        # 不应到达此处，保险返回
        elapsed_time = time.time() - start_time
        return {
            'success': False,
            'text': '',
            'error': 'AI 服务暂时不可用，请稍后重试',
            'error_code': 'AI_SERVICE_ERROR',
            'elapsed_time': elapsed_time
        }
    
    def stream_generate_text(self, prompt, max_tokens=2000, timeout: int = 60):
        """
        流式生成文本，通过 yield 逐块返回
        
        Args:
            prompt: 提示词
            max_tokens: 最大token数
            timeout: 请求超时时间（秒），默认60秒
            
        Yields:
            生成的文本块，错误时以 '[ERROR]' 开头
        """
        start_time = time.time()
        
        if not self.api_key:
            logger.error("API密钥未配置")
            yield '[ERROR] API密钥未配置|AI_AUTH_ERROR'
            return
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
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
                'temperature': 0.7,
                'incremental_output': True
            }
        }
        
        try:
            logger.info("调用百炼API流式生成，prompt长度=%d, timeout=%d", len(prompt), timeout)
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                stream=True,
                timeout=timeout
            )
            
            if response.status_code != 200:
                logger.error("流式API错误: %d", response.status_code)
                if response.status_code == 429:
                    yield '[ERROR] API 请求过于频繁，请稍后重试|AI_RATE_LIMIT'
                elif response.status_code == 401:
                    yield '[ERROR] API 认证失败，请检查 API Key|AI_AUTH_ERROR'
                elif response.status_code >= 500:
                    yield '[ERROR] AI 服务暂时不可用，请稍后重试|AI_SERVICE_ERROR'
                else:
                    yield f'[ERROR] API错误: {response.status_code}|AI_UNKNOWN_ERROR'
                return
            
            chunk_count = 0
            for line in response.iter_lines():
                if not line:
                    continue
                
                line_str = line.decode('utf-8') if isinstance(line, bytes) else line
                
                # 过滤出 data: 开头的行
                if not line_str.startswith('data:'):
                    continue
                
                data_str = line_str[len('data:'):]
                
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                
                # 解析增量文本
                text = ''
                if 'output' in data:
                    if 'text' in data['output']:
                        text = data['output']['text']
                    elif 'choices' in data['output']:
                        choices = data['output']['choices']
                        if choices:
                            text = choices[0].get('message', {}).get('content', '')
                
                if text:
                    chunk_count += 1
                    yield text
            
            elapsed_time = time.time() - start_time
            logger.info("流式生成完成，共%d块，耗时=%.2fs", chunk_count, elapsed_time)
            
        except requests.exceptions.Timeout:
            elapsed_time = time.time() - start_time
            logger.error("流式API超时，耗时=%.2fs", elapsed_time)
            yield '[ERROR] 请求超时，请稍后重试|AI_TIMEOUT'
        except requests.exceptions.ConnectionError:
            logger.error("流式API连接错误")
            yield '[ERROR] 网络连接失败，请稍后重试|AI_CONNECTION_ERROR'
        except Exception as e:
            logger.error("流式生成异常: %s", str(e))
            yield f'[ERROR] 生成失败: {str(e)}|AI_UNKNOWN_ERROR'


# 全局AI服务实例
ai_service = AIService()
