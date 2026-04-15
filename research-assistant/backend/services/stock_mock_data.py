"""
股票Mock数据服务 - 提供丰富的模拟股票数据
包含详细的公司信息、财务数据、技术指标、历史行情等
"""
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class StockMockDataService:
    """股票Mock数据服务"""
    
    # 扩展的股票池 - 包含更多A股、港股、美股
    STOCK_POOL = {
        # 白酒
        "600519.SH": {"name": "贵州茅台", "industry": "白酒", "sector": "消费", "market": "沪市主板"},
        "000858.SZ": {"name": "五粮液", "industry": "白酒", "sector": "消费", "market": "深市主板"},
        "000568.SZ": {"name": "泸州老窖", "industry": "白酒", "sector": "消费", "market": "深市主板"},
        "600809.SH": {"name": "山西汾酒", "industry": "白酒", "sector": "消费", "market": "沪市主板"},
        
        # 新能源
        "300750.SZ": {"name": "宁德时代", "industry": "动力电池", "sector": "新能源", "market": "创业板"},
        "601012.SH": {"name": "隆基绿能", "industry": "光伏", "sector": "新能源", "market": "沪市主板"},
        "002594.SZ": {"name": "比亚迪", "industry": "新能源汽车", "sector": "新能源", "market": "深市主板"},
        "300274.SZ": {"name": "阳光电源", "industry": "光伏逆变器", "sector": "新能源", "market": "创业板"},
        "688599.SH": {"name": "天合光能", "industry": "光伏", "sector": "新能源", "market": "科创板"},
        
        # 互联网/科技
        "00700.HK": {"name": "腾讯控股", "industry": "互联网", "sector": "科技", "market": "港股"},
        "03690.HK": {"name": "美团", "industry": "本地生活", "sector": "科技", "market": "港股"},
        "09988.HK": {"name": "阿里巴巴", "industry": "电商", "sector": "科技", "market": "港股"},
        "09618.HK": {"name": "京东集团", "industry": "电商", "sector": "科技", "market": "港股"},
        
        # 半导体
        "00981.HK": {"name": "中芯国际", "industry": "晶圆代工", "sector": "半导体", "market": "港股"},
        "688981.SH": {"name": "中芯国际", "industry": "晶圆代工", "sector": "半导体", "market": "科创板"},
        "603501.SH": {"name": "韦尔股份", "industry": "芯片设计", "sector": "半导体", "market": "沪市主板"},
        "002371.SZ": {"name": "北方华创", "industry": "半导体设备", "sector": "半导体", "market": "深市主板"},
        
        # 金融
        "600036.SH": {"name": "招商银行", "industry": "银行", "sector": "金融", "market": "沪市主板"},
        "601318.SH": {"name": "中国平安", "industry": "保险", "sector": "金融", "market": "沪市主板"},
        "600030.SH": {"name": "中信证券", "industry": "券商", "sector": "金融", "market": "沪市主板"},
        "601398.SH": {"name": "工商银行", "industry": "银行", "sector": "金融", "market": "沪市主板"},
        
        # 医药
        "603259.SH": {"name": "药明康德", "industry": "CXO", "sector": "医药", "market": "沪市主板"},
        "600276.SH": {"name": "恒瑞医药", "industry": "创新药", "sector": "医药", "market": "沪市主板"},
        "000538.SZ": {"name": "云南白药", "industry": "中药", "sector": "医药", "market": "深市主板"},
        "300122.SZ": {"name": "智飞生物", "industry": "疫苗", "sector": "医药", "market": "创业板"},
        
        # 电子
        "002415.SZ": {"name": "海康威视", "industry": "安防", "sector": "电子", "market": "深市主板"},
        "000725.SZ": {"name": "京东方A", "industry": "面板", "sector": "电子", "market": "深市主板"},
        "603288.SH": {"name": "海天味业", "industry": "调味品", "sector": "消费", "market": "沪市主板"},
        "000333.SZ": {"name": "美的集团", "industry": "家电", "sector": "消费", "market": "深市主板"},
    }
    
    # 行业基准数据
    INDUSTRY_BENCHMARKS = {
        "白酒": {"pe_range": (20, 45), "pb_range": (5, 15), "roe_range": (15, 35), "margin_range": (40, 80)},
        "动力电池": {"pe_range": (25, 60), "pb_range": (3, 12), "roe_range": (10, 25), "margin_range": (15, 30)},
        "光伏": {"pe_range": (15, 40), "pb_range": (2, 8), "roe_range": (8, 20), "margin_range": (10, 25)},
        "新能源汽车": {"pe_range": (20, 50), "pb_range": (3, 10), "roe_range": (8, 18), "margin_range": (10, 25)},
        "互联网": {"pe_range": (15, 35), "pb_range": (2, 8), "roe_range": (10, 25), "margin_range": (15, 40)},
        "晶圆代工": {"pe_range": (30, 80), "pb_range": (2, 6), "roe_range": (5, 15), "margin_range": (20, 45)},
        "芯片设计": {"pe_range": (35, 100), "pb_range": (3, 10), "roe_range": (8, 20), "margin_range": (25, 55)},
        "银行": {"pe_range": (4, 10), "pb_range": (0.5, 1.2), "roe_range": (8, 15), "margin_range": (30, 50)},
        "保险": {"pe_range": (8, 20), "pb_range": (0.8, 2), "roe_range": (10, 18), "margin_range": (8, 20)},
        "CXO": {"pe_range": (20, 50), "pb_range": (3, 10), "roe_range": (12, 25), "margin_range": (25, 45)},
        "创新药": {"pe_range": (30, 80), "pb_range": (4, 12), "roe_range": (10, 22), "margin_range": (20, 45)},
        "安防": {"pe_range": (15, 35), "pb_range": (2, 6), "roe_range": (15, 28), "margin_range": (35, 50)},
        "调味品": {"pe_range": (25, 55), "pb_range": (6, 18), "roe_range": (18, 32), "margin_range": (35, 55)},
        "家电": {"pe_range": (12, 25), "pb_range": (2, 5), "roe_range": (15, 28), "margin_range": (20, 35)},
        "其他": {"pe_range": (15, 35), "pb_range": (2, 6), "roe_range": (10, 20), "margin_range": (15, 30)},
    }
    
    # 公司详细描述
    COMPANY_DESCRIPTIONS = {
        "贵州茅台": "中国白酒行业龙头企业，主打产品茅台酒享誉全球，具有极高的品牌护城河和定价权。",
        "五粮液": "中国浓香型白酒代表，拥有深厚的历史底蕴和广泛的消费群体。",
        "宁德时代": "全球动力电池龙头，市场份额连续多年位居第一，技术实力雄厚。",
        "比亚迪": "新能源汽车全产业链布局，电池、整车、芯片一体化优势显著。",
        "腾讯控股": "中国互联网巨头，社交、游戏、金融科技、云计算多元发展。",
        "中芯国际": "中国大陆最大的晶圆代工厂，国产替代核心标的。",
        "招商银行": "零售银行标杆，资产质量和盈利能力行业领先。",
        "药明康德": "全球领先的医药研发服务平台，CXO行业龙头。",
        "海康威视": "全球安防监控龙头，AI视觉技术领先。",
    }
    
    def __init__(self):
        self._cache = {}
        self._price_cache = {}
    
    def get_stock_info(self, code: str) -> Optional[Dict]:
        """获取股票基本信息"""
        normalized_code = self._normalize_code(code)
        
        # 先尝试完整匹配
        if normalized_code in self.STOCK_POOL:
            info = self.STOCK_POOL[normalized_code].copy()
            info["code"] = normalized_code
            return info
        
        # 再尝试部分匹配
        for full_code, info in self.STOCK_POOL.items():
            if full_code.startswith(code.upper()):
                result = info.copy()
                result["code"] = full_code
                return result
        
        # 如果没找到，返回默认信息
        return {
            "code": normalized_code,
            "name": f"股票{code}",
            "industry": "其他",
            "sector": "其他",
            "market": "未知"
        }
    
    def _normalize_code(self, code: str) -> str:
        """标准化股票代码"""
        code = code.upper().strip()
        
        if '.' in code:
            return code
        
        if code.startswith('6'):
            return f"{code}.SH"
        elif code.startswith('0') or code.startswith('3'):
            return f"{code}.SZ"
        elif code.startswith('68'):
            return f"{code}.SH"
        elif code.startswith('8') or code.startswith('4'):
            return f"{code}.BJ"
        elif len(code) == 5:
            return f"{code}.HK"
        else:
            return f"{code}.SH"
    
    def generate_full_stock_data(self, code: str) -> Dict:
        """生成完整的股票数据"""
        stock_info = self.get_stock_info(code)
        industry = stock_info.get("industry", "其他")
        benchmarks = self.INDUSTRY_BENCHMARKS.get(industry, self.INDUSTRY_BENCHMARKS["其他"])
        
        # 生成基础价格
        base_price = self._generate_base_price(industry)
        
        return {
            "basic": stock_info,
            "quote": self._generate_quote(stock_info, base_price, benchmarks),
            "financial": self._generate_financial(stock_info, benchmarks),
            "company": self._generate_company_info(stock_info),
            "technicals": self._generate_technicals(base_price),
            "holders": self._generate_holders(),
            "history": self._generate_history(base_price),
            "peer_comparison": self._generate_peer_comparison(stock_info, benchmarks),
        }
    
    def _generate_base_price(self, industry: str) -> float:
        """根据行业生成基础价格"""
        price_ranges = {
            "白酒": (1000, 2000),
            "动力电池": (150, 400),
            "光伏": (20, 80),
            "新能源汽车": (150, 350),
            "互联网": (300, 600),
            "晶圆代工": (40, 120),
            "芯片设计": (80, 250),
            "银行": (4, 15),
            "保险": (40, 80),
            "CXO": (60, 150),
            "创新药": (40, 120),
            "安防": (25, 60),
            "调味品": (40, 100),
            "家电": (50, 120),
            "其他": (20, 100),
        }
        price_range = price_ranges.get(industry, (20, 100))
        return round(random.uniform(*price_range), 2)
    
    def _generate_quote(self, stock_info: Dict, base_price: float, benchmarks: Dict) -> Dict:
        """生成行情数据"""
        change_percent = round(random.uniform(-5, 5), 2)
        change_amount = round(base_price * change_percent / 100, 2)
        current_price = round(base_price + change_amount, 2)
        
        return {
            "code": stock_info["code"],
            "name": stock_info["name"],
            "current_price": current_price,
            "change_percent": change_percent,
            "change_amount": change_amount,
            "open": round(base_price * random.uniform(0.98, 1.02), 2),
            "high": round(current_price * random.uniform(1.01, 1.05), 2),
            "low": round(current_price * random.uniform(0.95, 0.99), 2),
            "prev_close": base_price,
            "volume": random.randint(50000, 5000000),
            "turnover": round(random.uniform(5000, 500000), 2),
            "market_cap": round(random.uniform(100, 25000), 2),
            "circulating_cap": round(random.uniform(80, 20000), 2),
            "pe_ratio": round(random.uniform(*benchmarks["pe_range"]), 2),
            "pb_ratio": round(random.uniform(*benchmarks["pb_range"]), 2),
            "ps_ratio": round(random.uniform(2, 15), 2),
            "dividend_yield": round(random.uniform(0.5, 4), 2),
            "eps_ttm": round(random.uniform(1, 50), 2),
            "bps": round(random.uniform(5, 200), 2),
            "total_shares": round(random.uniform(10, 200), 2),
            "circulating_shares": round(random.uniform(8, 180), 2),
            "turnover_rate": round(random.uniform(0.5, 8), 2),
            "amplitude": round(random.uniform(1, 6), 2),
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    
    def _generate_financial(self, stock_info: Dict, benchmarks: Dict) -> Dict:
        """生成财务数据"""
        roe = round(random.uniform(*benchmarks["roe_range"]), 2)
        margin = round(random.uniform(*benchmarks["margin_range"]), 2)
        
        return {
            # 盈利能力
            "roe": roe,
            "roe_diluted": round(roe * random.uniform(0.95, 0.99), 2),
            "roa": round(roe * random.uniform(0.4, 0.6), 2),
            "roic": round(roe * random.uniform(0.6, 0.8), 2),
            "gross_margin": margin,
            "net_margin": round(margin * random.uniform(0.3, 0.6), 2),
            "operating_margin": round(margin * random.uniform(0.5, 0.8), 2),
            "eps": round(random.uniform(1, 50), 2),
            "eps_growth": round(random.uniform(-20, 50), 2),
            
            # 资产负债
            "debt_ratio": round(random.uniform(25, 65), 2),
            "current_ratio": round(random.uniform(1.0, 3.0), 2),
            "quick_ratio": round(random.uniform(0.8, 2.5), 2),
            "cash_ratio": round(random.uniform(0.3, 1.5), 2),
            "equity_ratio": round(random.uniform(30, 70), 2),
            
            # 运营效率
            "inventory_turnover": round(random.uniform(3, 15), 2),
            "receivables_turnover": round(random.uniform(5, 25), 2),
            "asset_turnover": round(random.uniform(0.3, 1.2), 2),
            "cash_conversion_cycle": round(random.uniform(-30, 120), 0),
            
            # 成长能力
            "revenue_growth": round(random.uniform(-10, 60), 2),
            "profit_growth": round(random.uniform(-15, 80), 2),
            "revenue_cagr_3y": round(random.uniform(5, 40), 2),
            "profit_cagr_3y": round(random.uniform(5, 50), 2),
            
            # 现金流
            "operating_cash_flow": round(random.uniform(10, 500), 2),
            "free_cash_flow": round(random.uniform(5, 400), 2),
            "fcf_yield": round(random.uniform(2, 8), 2),
            "cash_per_share": round(random.uniform(2, 50), 2),
            
            # 估值指标
            "peg": round(random.uniform(0.5, 3), 2),
            "ev_ebitda": round(random.uniform(8, 30), 2),
            "price_to_sales": round(random.uniform(2, 15), 2),
            "price_to_cashflow": round(random.uniform(8, 40), 2),
            
            "report_date": "2024-09-30",
        }
    
    def _generate_company_info(self, stock_info: Dict) -> Dict:
        """生成公司信息"""
        name = stock_info["name"]
        description = self.COMPANY_DESCRIPTIONS.get(name, f"{name}是{stock_info.get('industry', '该')}行业的代表性企业。")
        
        return {
            "full_name": f"{name}股份有限公司",
            "description": description,
            "founded_year": random.randint(1980, 2010),
            "listing_date": f"{random.randint(2000, 2020)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
            "headquarters": random.choice(["北京", "上海", "深圳", "杭州", "广州", "成都"]),
            "employees": random.randint(1000, 200000),
            "website": f"www.{name.lower().replace(' ', '')}.com",
            "chairman": random.choice(["张三", "李四", "王五", "赵六", "陈七"]),
            "ceo": random.choice(["张三", "李四", "王五", "赵六", "陈七"]),
            "business_scope": f"主要从事{stock_info.get('industry', '相关')}业务，产品销往全球多个国家和地区。",
            "core_products": self._generate_core_products(stock_info.get("industry", "其他")),
        }
    
    def _generate_core_products(self, industry: str) -> List[str]:
        """生成核心产品"""
        products = {
            "白酒": ["茅台酒", "系列酒", "定制酒"],
            "动力电池": ["三元锂电池", "磷酸铁锂电池", "固态电池"],
            "光伏": ["单晶硅片", "光伏组件", "逆变器", "储能系统"],
            "新能源汽车": ["纯电动汽车", "插电式混动", "刀片电池"],
            "互联网": ["社交平台", "游戏", "云服务", "金融科技"],
            "晶圆代工": ["28nm芯片", "14nm芯片", "7nm芯片"],
            "芯片设计": ["图像传感器", "存储芯片", "AI芯片"],
            "银行": ["个人存款", "企业贷款", "财富管理", "信用卡"],
            "保险": ["人寿保险", "财产保险", "健康保险"],
            "CXO": ["药物发现", "临床前研究", "临床试验", "生产服务"],
            "创新药": ["抗肿瘤药", "免疫治疗", "罕见病药物"],
            "安防": ["监控摄像头", "门禁系统", "智能交通"],
            "调味品": ["酱油", "蚝油", "调味酱", "醋"],
            "家电": ["空调", "冰箱", "洗衣机", "小家电"],
        }
        return products.get(industry, ["核心产品A", "核心产品B", "核心产品C"])
    
    def _generate_technicals(self, base_price: float) -> Dict:
        """生成技术指标"""
        return {
            "ma5": round(base_price * random.uniform(0.98, 1.02), 2),
            "ma10": round(base_price * random.uniform(0.97, 1.03), 2),
            "ma20": round(base_price * random.uniform(0.96, 1.04), 2),
            "ma60": round(base_price * random.uniform(0.93, 1.07), 2),
            "ma120": round(base_price * random.uniform(0.90, 1.10), 2),
            "rsi14": round(random.uniform(30, 70), 2),
            "macd": round(random.uniform(-2, 2), 2),
            "kdj_k": round(random.uniform(20, 80), 2),
            "kdj_d": round(random.uniform(20, 80), 2),
            "boll_upper": round(base_price * 1.08, 2),
            "boll_middle": round(base_price, 2),
            "boll_lower": round(base_price * 0.92, 2),
            "volume_ma5": round(random.uniform(0.8, 1.2), 2),
            "volume_ma20": round(random.uniform(0.7, 1.3), 2),
        }
    
    def _generate_holders(self) -> Dict:
        """生成股东数据"""
        return {
            "total_holders": random.randint(50000, 500000),
            "institutional_holders": random.randint(100, 2000),
            "institutional_holdings": round(random.uniform(40, 85), 2),
            "top10_holders": round(random.uniform(50, 80), 2),
            "northbound_holdings": round(random.uniform(2, 15), 2),
            "fund_holdings": round(random.uniform(5, 30), 2),
            "insurance_holdings": round(random.uniform(1, 10), 2),
            "qfii_holdings": round(random.uniform(0.5, 5), 2),
        }
    
    def _generate_history(self, base_price: float) -> List[Dict]:
        """生成历史行情数据（最近30天）"""
        history = []
        current_price = base_price
        
        for i in range(30, 0, -1):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            change = random.uniform(-0.04, 0.04)
            current_price = current_price * (1 + change)
            
            history.append({
                "date": date,
                "open": round(current_price * random.uniform(0.99, 1.01), 2),
                "high": round(current_price * random.uniform(1.01, 1.04), 2),
                "low": round(current_price * random.uniform(0.96, 0.99), 2),
                "close": round(current_price, 2),
                "volume": random.randint(50000, 5000000),
                "turnover": round(random.uniform(5000, 500000), 2),
                "change_percent": round(change * 100, 2),
            })
        
        return history
    
    def _generate_peer_comparison(self, stock_info: Dict, benchmarks: Dict) -> List[Dict]:
        """生成同业对比数据"""
        peers = []
        current_code = stock_info.get("code", "")
        industry = stock_info.get("industry", "其他")
        sector = stock_info.get("sector", "")
        added_codes = set()
        
        # 优先找同 industry 的公司
        for code, info in self.STOCK_POOL.items():
            if code != current_code and info["industry"] == industry and code not in added_codes:
                self._add_peer(peers, code, info, benchmarks)
                added_codes.add(code)
                if len(peers) >= 4:
                    return peers
        
        # 不足4家时，按同 sector 补充
        if len(peers) < 4 and sector:
            for code, info in self.STOCK_POOL.items():
                if code != current_code and info.get("sector") == sector and code not in added_codes:
                    peer_industry = info["industry"]
                    peer_benchmarks = self.INDUSTRY_BENCHMARKS.get(peer_industry, benchmarks)
                    self._add_peer(peers, code, info, peer_benchmarks)
                    added_codes.add(code)
                    if len(peers) >= 4:
                        return peers
        
        # 仍不足，取其他热门公司补充
        if len(peers) < 4:
            for code, info in self.STOCK_POOL.items():
                if code != current_code and code not in added_codes:
                    peer_industry = info["industry"]
                    peer_benchmarks = self.INDUSTRY_BENCHMARKS.get(peer_industry, benchmarks)
                    self._add_peer(peers, code, info, peer_benchmarks)
                    added_codes.add(code)
                    if len(peers) >= 4:
                        break
        
        return peers
    
    def _add_peer(self, peers: list, code: str, info: Dict, benchmarks: Dict):
        """添加一个对标公司到列表"""
        industry = info["industry"]
        base_price = self._generate_base_price(industry)
        peers.append({
            "code": code,
            "name": info["name"],
            "industry": industry,
            "current_price": round(base_price * random.uniform(0.9, 1.1), 2),
            "change_percent": round(random.uniform(-3, 3), 2),
            "pe_ratio": round(random.uniform(*benchmarks["pe_range"]), 2),
            "pb_ratio": round(random.uniform(*benchmarks["pb_range"]), 2),
            "market_cap": round(random.uniform(100, 20000), 2),
            "roe": round(random.uniform(*benchmarks["roe_range"]), 2),
        })


# 全局实例
stock_mock_service = StockMockDataService()
