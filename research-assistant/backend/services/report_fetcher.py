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
        
        # 生成投资评级
        investment_rating = self._generate_investment_rating(rating)
        
        # 生成盈利能力指标
        profitability = self._generate_profitability(company)
        
        # 生成成长性指标
        growth = self._generate_growth()
        
        # 生成估值指标
        valuation = self._generate_valuation()
        
        # 生成偿债能力指标
        solvency = self._generate_solvency()
        
        # 生成现金流指标
        cashflow = self._generate_cashflow()
        
        # 生成研报原文
        content = self._generate_report_content(company, broker, analyst, rating, target_price, current_price, core_views, financial_forecast, profitability, growth, valuation)
        
        # 生成时间
        created_at = datetime.now() - timedelta(days=random.randint(0, 30))
        
        filename = f"{company['code'].replace('.', '_')}_{datetime.now().strftime('%Y%m%d')}_{random.randint(1000, 9999)}.pdf"
        
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
            'investment_rating': investment_rating,
            'profitability': profitability,
            'growth': growth,
            'valuation': valuation,
            'solvency': solvency,
            'cashflow': cashflow,
            'content': content,
            'file_path': f"uploads/{filename}",
            'filename': filename,
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
    
    def _generate_investment_rating(self, rating: str) -> Dict:
        """生成投资评级建议"""
        rating_map = {
            '买入': '建议买入',
            '增持': '建议买入',
            '推荐': '建议买入',
            '中性': '建议观望',
            '谨慎增持': '建议观望',
            '减持': '建议卖出',
            '卖出': '建议卖出',
        }
        
        return {
            'recommendation': rating_map.get(rating, '建议观望'),
            'change': random.choice(['维持', '上调', '下调']),
            'time_horizon': '12个月',
        }
    
    def _generate_profitability(self, company: Dict) -> Dict:
        """生成盈利能力指标"""
        # 根据行业调整基准值
        industry_margin = {
            '白酒': {'gross': 0.75, 'net': 0.35},
            '新能源': {'gross': 0.25, 'net': 0.10},
            '汽车': {'gross': 0.18, 'net': 0.05},
            '互联网': {'gross': 0.45, 'net': 0.15},
            '银行': {'gross': 0.50, 'net': 0.35},
            '半导体': {'gross': 0.40, 'net': 0.20},
            '医药': {'gross': 0.55, 'net': 0.18},
            '保险': {'gross': 0.20, 'net': 0.08},
            '电子': {'gross': 0.30, 'net': 0.12},
        }
        
        margins = industry_margin.get(company.get('industry', ''), 
                                     {'gross': 0.30, 'net': 0.10})
        
        revenue = random.uniform(100, 5000)
        
        return {
            'revenue': round(revenue, 1),
            'net_profit': round(revenue * margins['net'], 1),
            'gross_margin': round(margins['gross'] * 100 + random.uniform(-5, 5), 2),
            'net_margin': round(margins['net'] * 100 + random.uniform(-2, 2), 2),
            'roe': round(random.uniform(10, 25), 2),
            'roa': round(random.uniform(5, 15), 2),
            'roic': round(random.uniform(8, 20), 2),
        }
    
    def _generate_growth(self) -> Dict:
        """生成成长性指标"""
        return {
            'revenue_growth': round(random.uniform(5, 35), 2),
            'profit_growth': round(random.uniform(8, 40), 2),
            'net_profit_growth': round(random.uniform(8, 40), 2),
            'cagr_3y': round(random.uniform(10, 25), 2),
            'cagr_5y': round(random.uniform(8, 20), 2),
        }
    
    def _generate_valuation(self) -> Dict:
        """生成估值指标"""
        return {
            'pe_ttm': round(random.uniform(15, 50), 2),
            'pe_2024': round(random.uniform(15, 45), 2),
            'pe_2025': round(random.uniform(12, 40), 2),
            'pb': round(random.uniform(2, 8), 2),
            'ps': round(random.uniform(3, 15), 2),
            'peg': round(random.uniform(0.8, 2.0), 2),
            'ev_ebitda': round(random.uniform(10, 25), 2),
        }
    
    def _generate_solvency(self) -> Dict:
        """生成偿债能力指标"""
        return {
            'debt_to_asset': round(random.uniform(30, 60), 2),
            'current_ratio': round(random.uniform(1.2, 2.5), 2),
            'quick_ratio': round(random.uniform(0.8, 2.0), 2),
            'interest_coverage': round(random.uniform(5, 20), 2),
        }
    
    def _generate_cashflow(self) -> Dict:
        """生成现金流指标"""
        operating_cf = random.uniform(50, 1000)
        
        return {
            'operating_cashflow': round(operating_cf, 1),
            'free_cashflow': round(operating_cf * random.uniform(0.3, 0.7), 1),
            'cashflow_per_share': round(random.uniform(2, 30), 2),
            'operating_cashflow_margin': round(random.uniform(15, 35), 2),
        }
    
    def _generate_report_content(self, company: Dict, broker: str, analyst: str, rating: str, 
                                  target_price: float, current_price: float, core_views: str,
                                  financial_forecast: Dict, profitability: Dict, growth: Dict, 
                                  valuation: Dict) -> str:
        """生成研报原文内容"""
        report_date = datetime.now().strftime('%Y年%m月%d日')
        
        content = f"""{company['name']}({company['code']})研究报告

证券研究报告·公司研究·{company.get('industry', '综合')}

投资评级：{rating}
当前价格：{current_price}元
目标价格：{target_price}元

{report_date}

研究员：{analyst}
{broker}研究所

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、投资要点

{core_views}

二、公司概况

{company['name']}（股票代码：{company['code']}）是{company.get('industry', '相关行业')}行业的领先企业。公司主营业务突出，市场地位稳固，具有较强的竞争优势和盈利能力。

三、财务分析

3.1 盈利能力

公司盈利能力表现优异：
• 营业收入：{profitability.get('revenue', '-')}亿元
• 净利润：{profitability.get('net_profit', '-')}亿元
• 毛利率：{profitability.get('gross_margin', '-')}%
• 净利率：{profitability.get('net_margin', '-')}%
• ROE（净资产收益率）：{profitability.get('roe', '-')}%
• ROA（总资产收益率）：{profitability.get('roa', '-')}%

3.2 成长性分析

公司保持良好的增长态势：
• 营收增速：{growth.get('revenue_growth', '-')}%
• 净利润增速：{growth.get('profit_growth', '-')}%
• 3年复合增长率：{growth.get('cagr_3y', '-')}%

3.3 财务预测

基于对公司业务的深入分析，我们预测：
• 2024年营收：{financial_forecast.get('revenue_2024', '-')}亿元
• 2025年营收：{financial_forecast.get('revenue_2025', '-')}亿元
• 2024年净利润：{financial_forecast.get('net_profit_2024', '-')}亿元
• 2025年净利润：{financial_forecast.get('net_profit_2025', '-')}亿元

四、估值分析

当前公司估值水平：
• PE-TTM：{valuation.get('pe_ttm', '-')}倍
• PB：{valuation.get('pb', '-')}倍
• PEG：{valuation.get('peg', '-')}

基于DCF模型和相对估值法，我们认为公司合理目标价为{target_price}元，对应{rating}评级。

五、风险提示

1. 宏观经济波动风险
2. 行业竞争加剧风险
3. 原材料价格波动风险
4. 政策变化风险

六、投资建议

综合考虑公司基本面、行业地位和估值水平，我们给予{company['name']}{rating}评级，目标价{target_price}元。建议投资者关注公司长期投资价值。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

免责声明：本报告仅供参考，不构成投资建议。投资者应独立做出投资决策，自行承担投资风险。

{broker}研究所
{report_date}
"""
        return content
    
    def _map_rating_to_recommendation(self, rating: str) -> str:
        """将评级映射为投资建议"""
        rating_map = {
            '买入': '建议买入',
            '增持': '建议买入',
            '推荐': '建议买入',
            '中性': '建议观望',
            '谨慎增持': '建议观望',
            '减持': '建议卖出',
            '卖出': '建议卖出',
        }
        return rating_map.get(rating, '建议观望')
    
    def _generate_ai_report_content(self, company: Dict, broker: str, analyst: str, 
                                     ai_data: Dict, revenue_2024: float, net_profit_2024: float) -> str:
        """生成AI研报的原文内容"""
        report_date = datetime.now().strftime('%Y年%m月%d日')
        rating = ai_data.get('rating', '中性')
        target_price = float(ai_data.get('target_price', 100))
        core_views = ai_data.get('core_views', '')
        
        content = f"""{company['name']}({company['code']})深度研究报告

证券研究报告·公司研究·{company.get('industry', '综合')}

投资评级：{rating}
当前价格：{round(target_price * random.uniform(0.75, 0.95), 2)}元
目标价格：{target_price}元

{report_date}

研究员：{analyst}
{broker}研究所

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【投资要点】

{core_views}

【公司概况】

{company['name']}（股票代码：{company['code']}）是{company.get('industry', '相关行业')}行业的龙头企业。公司凭借强大的品牌优势、技术实力和渠道网络，在行业内保持领先地位。公司管理层经验丰富，战略清晰，执行力强。

【行业分析】

{company.get('industry', '相关行业')}行业正处于快速发展期，市场需求持续增长。行业集中度不断提升，龙头企业优势明显。政策支持加码，为行业发展提供良好环境。

【财务分析】

1. 盈利能力

公司盈利能力优秀，主要指标表现如下：
• 营业收入（2024E）：{revenue_2024}亿元
• 净利润（2024E）：{net_profit_2024}亿元
• 毛利率：{ai_data.get('gross_margin', '-')}%
• 净利率：{ai_data.get('net_margin', '-')}%
• ROE：{ai_data.get('roe', '-')}%

2. 成长性

公司保持稳健增长：
• 营收增速：{ai_data.get('revenue_growth', '-')}%
• 净利润增速：{ai_data.get('profit_growth', '-')}%

3. 财务预测

基于对行业和公司的深入研究，我们预计：
• 2024年营收：{ai_data.get('revenue_2024', '-')}亿元
• 2025年营收：{ai_data.get('revenue_2025', '-')}亿元
• 2024年净利润：{ai_data.get('net_profit_2024', '-')}亿元
• 2025年净利润：{ai_data.get('net_profit_2025', '-')}亿元

【估值分析】

当前公司估值水平合理：
• PE-TTM：{ai_data.get('pe_ttm', '-')}倍
• PB：{ai_data.get('pb', '-')}倍
• PEG：{ai_data.get('peg', '-')}

综合考虑公司成长性、盈利能力和行业地位，我们给予公司{target_price}元的目标价，对应{rating}评级。

【投资建议】

基于以上分析，我们给予{company['name']}{rating}评级。公司作为{company.get('industry', '相关行业')}行业龙头，具有较强的竞争优势和良好的成长前景。当前估值水平合理，具备较好的投资价值。建议投资者积极关注。

【风险提示】

1. 宏观经济下行风险
2. 行业竞争加剧风险
3. 原材料价格波动风险
4. 政策监管变化风险
5. 市场需求不及预期风险

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

免责声明：本报告基于公开信息分析，仅供参考，不构成投资建议。投资者应独立判断，自负盈亏。

{broker}研究所
{report_date}
"""
        return content
    
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
        prompt = f"""请为{company['name']}({company['code']})生成一份专业的证券研报分析。该公司属于{company.get('industry', '未知')}行业。

请生成以下内容的JSON格式数据：

1. 标题（50字以内，包含公司名称和核心投资逻辑）
2. 核心观点（3点，每点50字以内，突出投资亮点）
3. 投资评级（买入/增持/中性/减持之一）
4. 目标价（合理的目标股价，基于行业平均估值）
5. 盈利能力指标：
   - 毛利率(%)
   - 净利率(%)
   - ROE(%)
6. 成长性指标：
   - 营收增速(%)
   - 净利润增速(%)
7. 估值指标：
   - PE-TTM
   - PB
   - PEG

请严格按以下JSON格式输出（不要包含任何其他文字）：
{{
    "title": "研报标题",
    "core_views": "1. xxx 2. xxx 3. xxx",
    "rating": "买入",
    "target_price": 100.0,
    "revenue_2024": 500.0,
    "revenue_2025": 600.0,
    "net_profit_2024": 50.0,
    "net_profit_2025": 65.0,
    "gross_margin": 35.5,
    "net_margin": 15.0,
    "roe": 18.5,
    "revenue_growth": 25.5,
    "profit_growth": 30.2,
    "pe_ttm": 25.5,
    "pb": 3.2,
    "peg": 1.2
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
                filename = f"{company['code'].replace('.', '_')}_{datetime.now().strftime('%Y%m%d')}_{random.randint(1000, 9999)}.pdf"
                
                # 使用AI生成的财务指标
                revenue_2024 = float(ai_data.get('revenue_2024', 500))
                revenue_2025 = float(ai_data.get('revenue_2025', 600))
                net_profit_2024 = float(ai_data.get('net_profit_2024', 50))
                net_profit_2025 = float(ai_data.get('net_profit_2025', 65))
                target_price = float(ai_data.get('target_price', 100))
                
                return {
                    'id': f"rpt_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}",
                    'title': ai_data.get('title', self._generate_title(company, broker)),
                    'company': company['name'],
                    'company_code': company['code'],
                    'broker': broker,
                    'analyst': analyst,
                    'rating': ai_data.get('rating', '中性'),
                    'target_price': target_price,
                    'current_price': round(target_price * random.uniform(0.75, 0.95), 2),
                    'core_views': ai_data.get('core_views', ''),
                    'financial_forecast': {
                        'revenue_2024': revenue_2024,
                        'revenue_2025': revenue_2025,
                        'net_profit_2024': net_profit_2024,
                        'net_profit_2025': net_profit_2025,
                        'eps_2024': round(net_profit_2024 / random.uniform(10, 100), 2),
                        'eps_2025': round(net_profit_2025 / random.uniform(10, 100), 2),
                    },
                    'investment_rating': {
                        'recommendation': self._map_rating_to_recommendation(ai_data.get('rating', '中性')),
                        'change': random.choice(['维持', '上调', '下调']),
                        'time_horizon': '12个月',
                    },
                    'profitability': {
                        'revenue': revenue_2024,
                        'net_profit': net_profit_2024,
                        'gross_margin': float(ai_data.get('gross_margin', 35.0)),
                        'net_margin': float(ai_data.get('net_margin', 15.0)),
                        'roe': float(ai_data.get('roe', 15.0)),
                        'roa': round(random.uniform(5, 12), 2),
                        'roic': round(random.uniform(8, 18), 2),
                    },
                    'growth': {
                        'revenue_growth': float(ai_data.get('revenue_growth', 20.0)),
                        'profit_growth': float(ai_data.get('profit_growth', 25.0)),
                        'net_profit_growth': float(ai_data.get('profit_growth', 25.0)),
                        'cagr_3y': round(random.uniform(15, 25), 2),
                        'cagr_5y': round(random.uniform(12, 20), 2),
                    },
                    'valuation': {
                        'pe_ttm': float(ai_data.get('pe_ttm', 25.0)),
                        'pe_2024': round(float(ai_data.get('pe_ttm', 25.0)) * random.uniform(0.9, 1.1), 2),
                        'pe_2025': round(float(ai_data.get('pe_ttm', 25.0)) * random.uniform(0.8, 1.0), 2),
                        'pb': float(ai_data.get('pb', 3.0)),
                        'ps': round(random.uniform(2, 8), 2),
                        'peg': float(ai_data.get('peg', 1.2)),
                        'ev_ebitda': round(random.uniform(10, 20), 2),
                    },
                    'solvency': {
                        'debt_to_asset': round(random.uniform(30, 55), 2),
                        'current_ratio': round(random.uniform(1.2, 2.2), 2),
                        'quick_ratio': round(random.uniform(0.9, 1.8), 2),
                        'interest_coverage': round(random.uniform(8, 20), 2),
                    },
                    'cashflow': {
                        'operating_cashflow': round(net_profit_2024 * random.uniform(1.2, 1.8), 1),
                        'free_cashflow': round(net_profit_2024 * random.uniform(0.5, 1.0), 1),
                        'cashflow_per_share': round(random.uniform(3, 25), 2),
                        'operating_cashflow_margin': round(random.uniform(15, 30), 2),
                    },
                    'content': self._generate_ai_report_content(company, broker, analyst, ai_data, revenue_2024, net_profit_2024),
                    'file_path': f"uploads/{filename}",
                    'filename': filename,
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
