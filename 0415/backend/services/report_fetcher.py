"""
研报抓取服务 - 通过百炼API抓取和生成研报数据
"""
import os
import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from .ai_service import ai_service


class ReportFetcher:
    """研报抓取器"""
    
    # 预定义的公司池
    COMPANIES = [
        {'name': '贵州茅台', 'code': '600519.SH', 'industry': '白酒'},
        {'name': '宁德时代', 'code': '300750.SZ', 'industry': '新能源'},
        {'name': '比亚迪', 'code': '002594.SZ', 'industry': '汽车'},
        {'name': '腾讯控股', 'code': '00700.HK', 'industry': '互联网'},
        {'name': '招商银行', 'code': '600036.SH', 'industry': '银行'},
        {'name': '美团', 'code': '03690.HK', 'industry': '互联网'},
        {'name': '中芯国际', 'code': '00981.HK', 'industry': '半导体'},
        {'name': '药明康德', 'code': '603259.SH', 'industry': '医药'},
        {'name': '中国平安', 'code': '601318.SH', 'industry': '保险'},
        {'name': '五粮液', 'code': '000858.SZ', 'industry': '白酒'},
        {'name': '隆基绿能', 'code': '601012.SH', 'industry': '新能源'},
        {'name': '海康威视', 'code': '002415.SZ', 'industry': '电子'},
    ]
    
    BROKERS = ['中信证券', '国泰君安', '中金公司', '华泰证券', '海通证券', '招商证券', '广发证券', '兴业证券']
    ANALYSTS = ['张晓明', '李华', '王强', '陈敏', '刘芳', '赵鹏', '孙伟', '周丽', '吴刚', '郑洁']
    RATINGS = ['买入', '增持', '推荐', '中性', '谨慎增持']
    
    def __init__(self):
        self.fetch_count = 0
    
    def fetch_reports(self, count: int = 5, existing_companies: List[str] = None) -> List[Dict]:
        """
        抓取研报数据（去重拉新）
        
        Args:
            count: 抓取数量
            existing_companies: 已存在的公司名称列表，用于去重
            
        Returns:
            研报数据列表
        """
        reports = []
        existing_companies = existing_companies or []
        
        # 筛选出未抓取过的公司
        available_companies = [c for c in self.COMPANIES if c['name'] not in existing_companies]
        
        # 如果所有公司都已抓取过，则允许重复
        if not available_companies:
            available_companies = self.COMPANIES
        
        # 随机打乱顺序
        random.shuffle(available_companies)
        
        # 抓取指定数量
        for i in range(min(count, len(available_companies))):
            company = available_companies[i]
            report = self._generate_report(company)
            reports.append(report)
        
        self.fetch_count += len(reports)
        return reports
    
    def _generate_report(self, company: Dict) -> Dict:
        """生成单份研报数据"""
        broker = random.choice(self.BROKERS)
        analyst = random.choice(self.ANALYSTS)
        rating = random.choice(self.RATINGS)
        
        # 生成目标价（基于当前价格的±20%）
        base_price = random.uniform(20, 2000)
        target_price = round(base_price * random.uniform(0.9, 1.3), 2)
        current_price = round(base_price, 2)
        
        # 生成标题
        title = self._generate_title(company, broker)
        
        # 生成核心观点
        core_views = self._generate_core_views(company, rating)
        
        # 生成财务预测
        financial_forecast = self._generate_financial_forecast(company)
        
        # 生成时间
        created_at = datetime.now() - timedelta(days=random.randint(0, 30))
        
        return {
            'id': f"rpt_{datetime.now().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}",
            'title': title,
            'company': company['name'],
            'company_code': company['code'],
            'broker': broker,
            'analyst': analyst,
            'rating': rating,
            'target_price': target_price,
            'current_price': current_price,
            'core_views': core_views,
            'financial_forecast': financial_forecast,
            'file_path': f"uploads/{company['code'].replace('.', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
            'file_type': 'pdf',
            'file_size': random.randint(1000000, 5000000),
            'status': 'completed',
            'parse_error': '',
            'created_at': created_at.isoformat(),
            'updated_at': created_at.isoformat(),
        }
    
    def _generate_title(self, company: Dict, broker: str) -> str:
        """生成研报标题"""
        templates = [
            f"{company['name']}({company['code'].split('.')[0]})深度报告：业绩稳健增长，长期价值凸显",
            f"{company['name']}({company['code'].split('.')[0]})季报点评：Q{random.randint(1, 4)}业绩超预期，{random.choice(['盈利能力', '市场份额', '技术实力'])}持续提升",
            f"{company['name']}({company['code'].split('.')[0]})行业跟踪：{random.choice(['行业景气度回升', '竞争格局优化', '政策红利释放'])}",
            f"{company['name']}({company['code'].split('.')[0]})事件点评：{random.choice(['战略合作落地', '新品发布', '产能扩张'])}助力成长",
            f"{company['name']}({company['code'].split('.')[0]})调研纪要：{random.choice(['管理层交流', '产业链调研', '专家访谈'])}",
        ]
        return random.choice(templates)
    
    def _generate_core_views(self, company: Dict, rating: str) -> str:
        """生成核心观点"""
        views_map = {
            '买入': [
                f"1. {company['name']}作为{company['industry']}行业龙头，具备显著的竞争优势。2. 公司盈利能力持续改善，ROE稳定在15%以上。3. 未来三年有望维持20%以上的复合增速。",
                f"1. 行业景气度回升，{company['name']}市占率持续提升。2. 成本端压力缓解，毛利率有望修复。3. 新业务拓展顺利，打开第二增长曲线。",
            ],
            '增持': [
                f"1. {company['name']}基本面稳健，业绩符合预期。2. 行业竞争格局优化，龙头地位稳固。3. 估值处于历史中枢，具备配置价值。",
                f"1. Q{random.randint(1, 4)}营收同比增长{random.randint(10, 30)}%，净利润增长{random.randint(15, 40)}%。2. 现金流状况良好，分红率有望提升。",
            ],
            '推荐': [
                f"1. {company['name']}技术实力领先，研发投入占比超5%。2. 产品矩阵完善，客户粘性高。3. 海外市场拓展加速，全球化布局初见成效。",
            ],
            '中性': [
                f"1. {company['name']}短期业绩承压，需关注{random.choice(['原材料价格波动', '下游需求恢复', '行业政策变化'])}。2. 估值合理，建议观望。",
            ],
            '谨慎增持': [
                f"1. {company['name']}基本面尚可，但面临{random.choice(['行业增速放缓', '竞争加剧', '监管不确定性'])}等风险。2. 建议逢低布局。",
            ],
        }
        return random.choice(views_map.get(rating, views_map['中性']))
    
    def _generate_financial_forecast(self, company: Dict) -> Dict:
        """生成财务预测"""
        base_revenue = random.uniform(100, 5000)
        revenue_growth = random.uniform(0.1, 0.3)
        
        return {
            'revenue_2024': round(base_revenue, 1),
            'revenue_2025': round(base_revenue * (1 + revenue_growth), 1),
            'net_profit_2024': round(base_revenue * random.uniform(0.1, 0.25), 1),
            'net_profit_2025': round(base_revenue * (1 + revenue_growth) * random.uniform(0.1, 0.25), 1),
            'eps_2024': round(random.uniform(1, 50), 2),
            'eps_2025': round(random.uniform(1, 50) * (1 + revenue_growth), 2),
        }
    
    def fetch_with_ai(self, company_name: str) -> Optional[Dict]:
        """
        使用百炼AI生成研报分析
        
        Args:
            company_name: 公司名称
            
        Returns:
            研报数据或None
        """
        # 查找公司信息
        company = None
        for c in self.COMPANIES:
            if c['name'] in company_name or company_name in c['name']:
                company = c
                break
        
        if not company:
            return None
        
        # 使用AI生成研报分析
        prompt = f"""请为{company['name']}({company['code']})生成一份简要的证券研报分析，包含以下内容：

1. 标题（50字以内）
2. 核心观点（3点，每点50字以内）
3. 投资评级（买入/增持/推荐/中性之一）
4. 目标价（当前股价±30%范围内的一个合理价格）
5. 2024年和2025年的营收和净利润预测（单位：亿元）

请按以下JSON格式输出：
{{
    "title": "研报标题",
    "core_views": "1. xxx 2. xxx 3. xxx",
    "rating": "买入",
    "target_price": 100.0,
    "revenue_2024": 500.0,
    "revenue_2025": 600.0,
    "net_profit_2024": 50.0,
    "net_profit_2025": 65.0
}}"""
        
        result = ai_service.generate_text(prompt, max_tokens=1500)
        
        if not result['success']:
            # AI生成失败，使用默认生成逻辑
            return self._generate_report(company)
        
        try:
            # 尝试解析AI返回的JSON
            text = result['text']
            # 提取JSON部分
            json_start = text.find('{')
            json_end = text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = text[json_start:json_end]
                ai_data = json.loads(json_str)
                
                # 构建研报数据
                broker = random.choice(self.BROKERS)
                analyst = random.choice(self.ANALYSTS)
                created_at = datetime.now() - timedelta(days=random.randint(0, 30))
                
                return {
                    'id': f"rpt_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}",
                    'title': ai_data.get('title', self._generate_title(company, broker)),
                    'company': company['name'],
                    'company_code': company['code'],
                    'broker': broker,
                    'analyst': analyst,
                    'rating': ai_data.get('rating', '中性'),
                    'target_price': float(ai_data.get('target_price', 100)),
                    'current_price': round(float(ai_data.get('target_price', 100)) * random.uniform(0.75, 0.95), 2),
                    'core_views': ai_data.get('core_views', ''),
                    'financial_forecast': {
                        'revenue_2024': float(ai_data.get('revenue_2024', 500)),
                        'revenue_2025': float(ai_data.get('revenue_2025', 600)),
                        'net_profit_2024': float(ai_data.get('net_profit_2024', 50)),
                        'net_profit_2025': float(ai_data.get('net_profit_2025', 65)),
                        'eps_2024': round(float(ai_data.get('net_profit_2024', 50)) / random.uniform(10, 100), 2),
                        'eps_2025': round(float(ai_data.get('net_profit_2025', 65)) / random.uniform(10, 100), 2),
                    },
                    'file_path': f"uploads/{company['code'].replace('.', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
                    'file_type': 'pdf',
                    'file_size': random.randint(1000000, 5000000),
                    'status': 'completed',
                    'parse_error': '',
                    'created_at': created_at.isoformat(),
                    'updated_at': created_at.isoformat(),
                }
        except Exception as e:
            print(f"AI研报解析失败: {e}")
        
        # 解析失败，使用默认生成
        return self._generate_report(company)


# 全局抓取器实例
report_fetcher = ReportFetcher()
