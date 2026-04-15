"""
股票数据服务 - 提供丰富的Mock股票数据
包含详细的公司信息、财务数据、技术指标、历史行情等
"""
import os
import json
import random
from typing import Dict, List, Optional
from services.stock_mock_data import stock_mock_service


class StockService:
    """股票数据服务"""
    
    # 预定义的股票池（与report_fetcher中的公司列表一致）
    STOCK_POOL = [
        {"code": "600519.SH", "name": "贵州茅台", "industry": "白酒"},
        {"code": "300750.SZ", "name": "宁德时代", "industry": "新能源"},
        {"code": "002594.SZ", "name": "比亚迪", "industry": "汽车"},
        {"code": "00700.HK", "name": "腾讯控股", "industry": "互联网"},
        {"code": "600036.SH", "name": "招商银行", "industry": "银行"},
        {"code": "03690.HK", "name": "美团", "industry": "互联网"},
        {"code": "00981.HK", "name": "中芯国际", "industry": "半导体"},
        {"code": "603259.SH", "name": "药明康德", "industry": "医药"},
        {"code": "601318.SH", "name": "中国平安", "industry": "保险"},
        {"code": "000858.SZ", "name": "五粮液", "industry": "白酒"},
        {"code": "601012.SH", "name": "隆基绿能", "industry": "新能源"},
        {"code": "002415.SZ", "name": "海康威视", "industry": "电子"},
    ]
    
    def __init__(self):
        self._cache = {}
    
    def search_stocks(self, keyword: str) -> List[Dict]:
        """
        搜索股票
        
        Args:
            keyword: 搜索关键词（股票代码或名称）
            
        Returns:
            匹配的股票列表
        """
        if not keyword:
            return self.STOCK_POOL
        
        keyword = keyword.upper()
        results = []
        
        for stock in self.STOCK_POOL:
            if keyword in stock["code"] or keyword in stock["name"]:
                results.append(stock)
        
        return results
    
    def _normalize_code(self, code: str) -> str:
        """
        标准化股票代码格式
        将 600519 转换为 600519.SH
        """
        code = code.upper().strip()
        
        # 如果已经有后缀，直接返回
        if '.' in code:
            return code
        
        # 根据代码前缀判断市场
        if code.startswith('6'):
            return f"{code}.SH"
        elif code.startswith('0') or code.startswith('3'):
            return f"{code}.SZ"
        elif code.startswith('8') or code.startswith('4'):
            return f"{code}.BJ"
        elif len(code) == 5 and code.startswith('0'):
            return f"{code}.HK"
        else:
            # 默认尝试上海市场
            return f"{code}.SH"
    
    def get_stock_info(self, code: str) -> Optional[Dict]:
        """
        获取股票基本信息
        
        Args:
            code: 股票代码（支持 600519 或 600519.SH 格式）
            
        Returns:
            股票信息字典
        """
        normalized_code = self._normalize_code(code)
        
        # 先尝试完整匹配
        for stock in self.STOCK_POOL:
            if stock["code"] == normalized_code:
                return stock
        
        # 再尝试部分匹配（如 600519 匹配 600519.SH）
        for stock in self.STOCK_POOL:
            if stock["code"].startswith(code.upper()):
                return stock
        
        # 如果没找到，返回一个动态创建的股票信息
        return {
            "code": normalized_code,
            "name": f"股票{code}",
            "industry": "其他"
        }
    
    def generate_stock_quote(self, code: str) -> Dict:
        """生成股票行情数据"""
        full_data = stock_mock_service.generate_full_stock_data(code)
        return full_data.get("quote", {})
    
    def generate_financial_indicators(self, code: str) -> Dict:
        """生成财务指标数据"""
        full_data = stock_mock_service.generate_full_stock_data(code)
        return full_data.get("financial", {})
    
    def generate_full_data(self, code: str) -> Dict:
        """生成完整股票数据"""
        return stock_mock_service.generate_full_stock_data(code)
    
    def _generate_mock_quote(self, code: str, stock: Optional[Dict] = None) -> Dict:
        """生成模拟行情数据"""
        if not stock:
            stock = {"name": "未知股票", "industry": "其他"}
        
        # 根据行业生成基础价格
        base_prices = {
            "白酒": (1500, 2000),
            "新能源": (100, 300),
            "汽车": (200, 400),
            "互联网": (300, 600),
            "银行": (30, 50),
            "半导体": (50, 150),
            "医药": (80, 200),
            "保险": (40, 80),
            "电子": (30, 100),
            "其他": (50, 200)
        }
        
        price_range = base_prices.get(stock.get("industry", "其他"), (50, 200))
        base_price = random.uniform(*price_range)
        change_percent = random.uniform(-5, 5)
        change_amount = base_price * change_percent / 100
        current_price = base_price + change_amount
        
        return {
            "code": code,
            "name": stock.get("name", "未知股票"),
            "industry": stock.get("industry", "其他"),
            "current_price": round(current_price, 2),
            "change_percent": round(change_percent, 2),
            "change_amount": round(change_amount, 2),
            "volume": random.randint(10000, 1000000),
            "turnover": round(random.uniform(1000, 50000), 2),
            "market_cap": round(random.uniform(100, 20000), 2),
            "pe_ratio": round(random.uniform(10, 50), 2),
            "pb_ratio": round(random.uniform(1, 10), 2),
            "high": round(current_price * random.uniform(1.01, 1.05), 2),
            "low": round(current_price * random.uniform(0.95, 0.99), 2),
            "open": round(base_price * random.uniform(0.98, 1.02), 2),
            "prev_close": round(base_price, 2),
            "update_time": self._get_current_time()
        }
    
    def _generate_mock_financials(self, code: str, stock: Optional[Dict] = None) -> Dict:
        """生成模拟财务指标数据"""
        if not stock:
            stock = {"name": "未知股票", "industry": "其他"}
        
        # 根据行业生成不同的财务特征
        industry_params = {
            "白酒": {"roe": (15, 30), "margin": (40, 70)},
            "新能源": {"roe": (10, 20), "margin": (15, 30)},
            "汽车": {"roe": (8, 15), "margin": (10, 20)},
            "互联网": {"roe": (12, 25), "margin": (20, 40)},
            "银行": {"roe": (10, 15), "margin": (30, 50)},
            "半导体": {"roe": (8, 18), "margin": (20, 40)},
            "医药": {"roe": (12, 22), "margin": (25, 45)},
            "保险": {"roe": (12, 18), "margin": (10, 20)},
            "电子": {"roe": (10, 20), "margin": (15, 30)},
            "其他": {"roe": (8, 15), "margin": (15, 25)}
        }
        
        params = industry_params.get(stock.get("industry", "其他"), 
                                     {"roe": (8, 15), "margin": (15, 25)})
        
        return {
            "code": code,
            "name": stock.get("name", "未知股票"),
            "roe": round(random.uniform(*params["roe"]), 2),
            "roa": round(random.uniform(5, 12), 2),
            "gross_margin": round(random.uniform(*params["margin"]), 2),
            "net_margin": round(random.uniform(10, 30), 2),
            "debt_ratio": round(random.uniform(30, 60), 2),
            "current_ratio": round(random.uniform(1.0, 2.5), 2),
            "quick_ratio": round(random.uniform(0.8, 2.0), 2),
            "revenue_growth": round(random.uniform(-10, 30), 2),
            "profit_growth": round(random.uniform(-15, 40), 2),
            "eps": round(random.uniform(1, 20), 2),
            "bps": round(random.uniform(10, 100), 2),
            "dividend_yield": round(random.uniform(1, 5), 2)
        }
    
    def _get_current_time(self) -> str:
        """获取当前时间字符串"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# 全局股票服务实例
stock_service = StockService()
