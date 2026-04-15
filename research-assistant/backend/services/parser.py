"""
研报解析服务
"""
import re
from typing import Dict, Optional


class ReportParser:
    """研报解析器"""
    
    def parse(self, file_path: str, file_type: str) -> Dict:
        """解析研报文件
        
        Args:
            file_path: 文件路径
            file_type: 文件类型 (pdf/html)
        
        Returns:
            {
                'success': bool,
                'data': {...},  # 解析成功时
                'error': str     # 解析失败时
            }
        """
        try:
            if file_type.lower() in ['pdf']:
                return self._parse_pdf(file_path)
            elif file_type.lower() in ['html', 'htm']:
                return self._parse_html(file_path)
            else:
                return {
                    'success': False,
                    'error': f'不支持的文件类型: {file_type}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': f'解析失败: {str(e)}'
            }
    
    def _parse_pdf(self, file_path: str) -> Dict:
        """解析PDF文件"""
        try:
            import pdfplumber
            
            text_content = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
            
            full_text = '\n'.join(text_content)
            return self._extract_info(full_text)
            
        except ImportError:
            # 降级使用PyPDF2
            try:
                import PyPDF2
                
                text_content = []
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text = page.extract_text()
                        if text:
                            text_content.append(text)
                
                full_text = '\n'.join(text_content)
                return self._extract_info(full_text)
                
            except Exception as e:
                return {
                    'success': False,
                    'error': f'PDF解析失败: {str(e)}'
                }
    
    def _parse_html(self, file_path: str) -> Dict:
        """解析HTML文件"""
        try:
            from bs4 import BeautifulSoup
            
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
            
            # 移除script和style标签
            for script in soup(["script", "style"]):
                script.decompose()
            
            full_text = soup.get_text(separator='\n', strip=True)
            return self._extract_info(full_text)
            
        except Exception as e:
            return {
                'success': False,
                'error': f'HTML解析失败: {str(e)}'
            }
    
    def _extract_info(self, text: str) -> Dict:
        """从文本中提取关键信息"""
        result = {
            'success': True,
            'data': {
                'title': self._extract_title(text),
                'company': self._extract_company(text),
                'company_code': self._extract_company_code(text),
                'broker': self._extract_broker(text),
                'analyst': self._extract_analyst(text),
                'rating': self._extract_rating(text),
                'target_price': self._extract_target_price(text),
                'current_price': self._extract_current_price(text),
                'core_views': self._extract_core_views(text),
                'financial_forecast': self._extract_financial_forecast(text),
                # 新增详细财务指标
                'investment_rating': self._extract_investment_rating(text),
                'profitability': self._extract_profitability(text),
                'growth': self._extract_growth(text),
                'valuation': self._extract_valuation(text),
                'solvency': self._extract_solvency(text),
                'cashflow': self._extract_cashflow(text),
            }
        }
        return result
    
    def _extract_title(self, text: str) -> str:
        """提取标题"""
        # 通常标题在文档开头
        lines = text.split('\n')[:10]
        for line in lines:
            line = line.strip()
            if len(line) > 10 and len(line) < 100:
                # 排除常见的页眉文字
                if not any(x in line for x in ['证券研究报告', '请仔细阅读', '免责声明', '页']):
                    return line
        return ''
    
    def _extract_company(self, text: str) -> str:
        """提取公司名称"""
        patterns = [
            r'([\u4e00-\u9fa5]{2,20})(?:股份|集团|科技|有限)公司',
            r'投资评级[：:]\s*([\u4e00-\u9fa5]{2,20})',
            r'([\u4e00-\u9fa5]{2,20})\s*\(\d{6}\)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return ''
    
    def _extract_company_code(self, text: str) -> str:
        """提取股票代码"""
        patterns = [
            r'\((\d{6})\)',  # (000001)
            r'(\d{6})\.\w{2}',  # 000001.SZ
            r'股票代码[：:]\s*(\d{6})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return ''
    
    def _extract_broker(self, text: str) -> str:
        """提取券商名称"""
        patterns = [
            r'(\w+)(?:证券|研究所|研究中心)',
            r'研究员[：:]\s*\w+\s*\((\w+)(?:证券)?\)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1) + '证券'
        
        # 常见券商列表
        brokers = ['中金', '中信', '华泰', '国泰君安', '海通', '招商', '广发', '申万宏源', '银河', '国信']
        for broker in brokers:
            if broker in text:
                return broker + '证券'
        return ''
    
    def _extract_analyst(self, text: str) -> str:
        """提取分析师"""
        patterns = [
            r'研究员[：:]\s*([\u4e00-\u9fa5]{2,4})',
            r'分析师[：:]\s*([\u4e00-\u9fa5]{2,4})',
            r'([\u4e00-\u9fa5]{2,4})\s*SAC\s*执业证书',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return ''
    
    def _extract_rating(self, text: str) -> str:
        """提取投资评级"""
        ratings = ['买入', '增持', '中性', '减持', '卖出']
        for rating in ratings:
            if rating in text:
                return rating
        
        # 评级变化
        patterns = [
            r'投资评级[：:]\s*(\w+)',
            r'评级[：:]\s*(\w+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return ''
    
    def _extract_target_price(self, text: str) -> Optional[float]:
        """提取目标价"""
        patterns = [
            r'目标价[：:]\s*(\d+\.?\d*)',
            r'目标价格[：:]\s*(\d+\.?\d*)',
            r'目标价位[：:]\s*(\d+\.?\d*)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    return float(match.group(1))
                except:
                    pass
        return None
    
    def _extract_current_price(self, text: str) -> Optional[float]:
        """提取当前价"""
        patterns = [
            r'当前价[：:]\s*(\d+\.?\d*)',
            r'现价[：:]\s*(\d+\.?\d*)',
            r'收盘价[：:]\s*(\d+\.?\d*)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    return float(match.group(1))
                except:
                    pass
        return None
    
    def _extract_core_views(self, text: str) -> str:
        """提取核心观点"""
        # 寻找投资要点或核心观点部分
        patterns = [
            r'投资要点[：:]\s*([\s\S]{50,500}?)(?=\n\s*\n|\Z)',
            r'核心观点[：:]\s*([\s\S]{50,500}?)(?=\n\s*\n|\Z)',
            r'主要观点[：:]\s*([\s\S]{50,500}?)(?=\n\s*\n|\Z)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()[:500]
        
        # 如果没有明确标记，取前300字作为核心观点
        text_clean = text.replace('\n', ' ').strip()
        return text_clean[:300] if len(text_clean) > 300 else text_clean
    
    def _extract_financial_forecast(self, text: str) -> Dict:
        """提取财务预测"""
        forecast = {}
        
        # 尝试提取营收、利润预测
        patterns = {
            'revenue_2024': r'2024[年]?\s*营收[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'revenue_2025': r'2025[年]?\s*营收[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'net_profit_2024': r'2024[年]?\s*(?:净利润|归母净利润)[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'net_profit_2025': r'2025[年]?\s*(?:净利润|归母净利润)[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'eps_2024': r'2024[年]?\s*EPS[：:]?\s*([\d\.]+)',
            'eps_2025': r'2025[年]?\s*EPS[：:]?\s*([\d\.]+)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    value = match.group(1).replace(',', '')
                    forecast[key] = float(value)
                except:
                    pass
        
        return forecast
    
    def _extract_investment_rating(self, text: str) -> Dict:
        """提取投资评级建议"""
        rating = {}
        
        # 评级建议
        if '强烈建议买入' in text or '强烈买入' in text:
            rating['recommendation'] = '强烈建议买入'
        elif '建议买入' in text or '买入' in text:
            rating['recommendation'] = '建议买入'
        elif '建议观望' in text or '中性' in text or '持有' in text:
            rating['recommendation'] = '建议观望'
        elif '建议卖出' in text or '减持' in text or '卖出' in text:
            rating['recommendation'] = '建议卖出'
        else:
            rating['recommendation'] = self._extract_rating(text)
        
        # 评级变化
        patterns = [
            r'评级[（(]?(?:维持|上调|下调)[）)]?[：:]?\s*(\w+)',
            r'(维持|上调|下调)\s*(\w+)评级',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                rating['change'] = match.group(1)
                break
        
        # 投资期限
        if '长期' in text or '12个月' in text:
            rating['time_horizon'] = '12个月'
        elif '中期' in text or '6个月' in text:
            rating['time_horizon'] = '6个月'
        else:
            rating['time_horizon'] = '12个月'
        
        return rating
    
    def _extract_profitability(self, text: str) -> Dict:
        """提取盈利能力指标"""
        profitability = {}
        
        patterns = {
            'revenue': r'营业[收入][：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'net_profit': r'(?:归母)?净利润[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'gross_margin': r'毛利率[：:]?\s*([\d\.]+)%',
            'net_margin': r'净利率[：:]?\s*([\d\.]+)%',
            'roe': r'ROE[：:]?\s*([\d\.]+)%?',
            'roa': r'ROA[：:]?\s*([\d\.]+)%?',
            'roic': r'ROIC[：:]?\s*([\d\.]+)%?',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    value = match.group(1).replace(',', '')
                    profitability[key] = float(value)
                except:
                    pass
        
        return profitability
    
    def _extract_growth(self, text: str) -> Dict:
        """提取成长性指标"""
        growth = {}
        
        patterns = {
            'revenue_growth': r'营收(?:增速|增长|同比)[：:]?\s*([\d\.]+)%',
            'profit_growth': r'净利润(?:增速|增长|同比)[：:]?\s*([\d\.]+)%',
            'net_profit_growth': r'归母净利润(?:增速|增长|同比)[：:]?\s*([\d\.]+)%',
            'cagr_3y': r'(?:3年|三年)复合[增速|增长率|CAGR][：:]?\s*([\d\.]+)%',
            'cagr_5y': r'(?:5年|五年)复合[增速|增长率|CAGR][：:]?\s*([\d\.]+)%',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    growth[key] = float(match.group(1))
                except:
                    pass
        
        return growth
    
    def _extract_valuation(self, text: str) -> Dict:
        """提取估值指标"""
        valuation = {}
        
        patterns = {
            'pe_ttm': r'PE[-_]?TTM[：:]?\s*([\d\.]+)',
            'pe_2024': r'2024[年]?\s*PE[：:]?\s*([\d\.]+)',
            'pe_2025': r'2025[年]?\s*PE[：:]?\s*([\d\.]+)',
            'pb': r'PB[：:]?\s*([\d\.]+)',
            'ps': r'PS[：:]?\s*([\d\.]+)',
            'peg': r'PEG[：:]?\s*([\d\.]+)',
            'ev_ebitda': r'EV/EBITDA[：:]?\s*([\d\.]+)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    valuation[key] = float(match.group(1))
                except:
                    pass
        
        return valuation
    
    def _extract_solvency(self, text: str) -> Dict:
        """提取偿债能力指标"""
        solvency = {}
        
        patterns = {
            'debt_to_asset': r'资产负债率[：:]?\s*([\d\.]+)%?',
            'current_ratio': r'流动比率[：:]?\s*([\d\.]+)',
            'quick_ratio': r'速动比率[：:]?\s*([\d\.]+)',
            'interest_coverage': r'利息保障倍数[：:]?\s*([\d\.]+)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    solvency[key] = float(match.group(1))
                except:
                    pass
        
        return solvency
    
    def _extract_cashflow(self, text: str) -> Dict:
        """提取现金流指标"""
        cashflow = {}
        
        patterns = {
            'operating_cashflow': r'经营[性]?现金流[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'free_cashflow': r'自由现金流[：:]?\s*([\d,\.]+)\s*(?:亿元|亿)',
            'cashflow_per_share': r'每股现金流[：:]?\s*([\d\.]+)',
            'operating_cashflow_margin': r'现金流[营业]?利润率[：:]?\s*([\d\.]+)%',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    value = match.group(1).replace(',', '')
                    cashflow[key] = float(value)
                except:
                    pass
        
        return cashflow
