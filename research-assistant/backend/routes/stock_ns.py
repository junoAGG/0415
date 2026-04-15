"""
股票数据 API - Flask-RESTX 命名空间
提供股票搜索、行情数据、财务指标等接口
"""
from flask_restx import Namespace, Resource, fields
from services.stock_service import stock_service
from routes.agent_ns import generate_trace_id, success_response_model, error_response_model

# 创建命名空间
stock_ns = Namespace('stock', description='股票数据相关接口')

# ============ API Models (用于Swagger文档) ============

# 股票基础模型
stock_base_model = stock_ns.model('StockBase', {
    'code': fields.String(description='股票代码', example='600519.SH'),
    'name': fields.String(description='股票名称', example='贵州茅台'),
    'industry': fields.String(description='所属行业', example='白酒'),
})

# 行情数据模型
stock_quote_model = stock_ns.model('StockQuote', {
    'code': fields.String(description='股票代码'),
    'name': fields.String(description='股票名称'),
    'industry': fields.String(description='所属行业'),
    'current_price': fields.Float(description='当前价格', example=1688.88),
    'change_percent': fields.Float(description='涨跌幅(%)', example=2.5),
    'change_amount': fields.Float(description='涨跌额', example=41.22),
    'volume': fields.Integer(description='成交量(手)', example=15000),
    'turnover': fields.Float(description='成交额(万元)', example=25300.5),
    'market_cap': fields.Float(description='总市值(亿元)', example=21200.5),
    'pe_ratio': fields.Float(description='市盈率', example=28.5),
    'pb_ratio': fields.Float(description='市净率', example=8.2),
    'high': fields.Float(description='最高价', example=1700.0),
    'low': fields.Float(description='最低价', example=1660.0),
    'open': fields.Float(description='开盘价', example=1665.0),
    'prev_close': fields.Float(description='昨收价', example=1647.66),
    'update_time': fields.String(description='更新时间', example='2025-04-15 14:30:00'),
})

# 财务指标模型
stock_financial_model = stock_ns.model('StockFinancial', {
    'code': fields.String(description='股票代码'),
    'name': fields.String(description='股票名称'),
    'roe': fields.Float(description='净资产收益率(%)', example=18.5),
    'roa': fields.Float(description='总资产收益率(%)', example=12.3),
    'gross_margin': fields.Float(description='毛利率(%)', example=52.8),
    'net_margin': fields.Float(description='净利率(%)', example=28.5),
    'debt_ratio': fields.Float(description='资产负债率(%)', example=35.2),
    'current_ratio': fields.Float(description='流动比率', example=1.85),
    'quick_ratio': fields.Float(description='速动比率', example=1.52),
    'revenue_growth': fields.Float(description='营收增长率(%)', example=15.3),
    'profit_growth': fields.Float(description='净利润增长率(%)', example=22.1),
    'eps': fields.Float(description='每股收益', example=42.5),
    'bps': fields.Float(description='每股净资产', example=205.8),
    'dividend_yield': fields.Float(description='股息率(%)', example=2.1),
})

# 股票详情模型（包含行情和财务）
stock_detail_model = stock_ns.model('StockDetail', {
    'code': fields.String(description='股票代码'),
    'name': fields.String(description='股票名称'),
    'industry': fields.String(description='所属行业'),
    'quote': fields.Nested(stock_quote_model, description='行情数据'),
    'financial': fields.Nested(stock_financial_model, description='财务指标'),
})


# ============ API Routes ============

@stock_ns.route('/search')
class StockSearch(Resource):
    """股票搜索接口"""
    
    @stock_ns.doc('search_stocks', params={
        'q': {'description': '搜索关键词（股票代码或名称）', 'type': 'string', 'default': ''}
    })
    @stock_ns.response(200, '成功', success_response_model)
    @stock_ns.response(500, '服务器错误', error_response_model)
    def get(self):
        """搜索股票
        
        根据关键词搜索股票，支持股票代码或名称模糊匹配
        """
        from flask import request
        
        keyword = request.args.get('q', '')
        trace_id = generate_trace_id()
        
        try:
            results = stock_service.search_stocks(keyword)
            
            return {
                'code': 0,
                'message': 'success',
                'data': {
                    'items': results,
                    'total': len(results)
                },
                'trace_id': trace_id
            }
        except Exception as e:
            return {
                'code': 500,
                'message': f'搜索失败: {str(e)}',
                'data': None,
                'trace_id': trace_id
            }, 500


@stock_ns.route('/<string:code>')
@stock_ns.param('code', '股票代码，如 600519.SH')
class StockDetail(Resource):
    """股票详情接口"""
    
    @stock_ns.doc('get_stock_detail')
    @stock_ns.response(200, '成功', success_response_model)
    @stock_ns.response(404, '股票不存在', error_response_model)
    @stock_ns.response(500, '服务器错误', error_response_model)
    def get(self, code: str):
        """获取股票详情
        
        获取指定股票的基本信息
        """
        trace_id = generate_trace_id()
        
        try:
            stock = stock_service.get_stock_info(code)
            
            if not stock:
                return {
                    'code': 404,
                    'message': f'股票 {code} 不存在',
                    'data': None,
                    'trace_id': trace_id
                }, 404
            
            return {
                'code': 0,
                'message': 'success',
                'data': stock,
                'trace_id': trace_id
            }
        except Exception as e:
            return {
                'code': 500,
                'message': f'获取股票详情失败: {str(e)}',
                'data': None,
                'trace_id': trace_id
            }, 500


@stock_ns.route('/<string:code>/quote')
@stock_ns.param('code', '股票代码，如 600519.SH')
class StockQuote(Resource):
    """股票行情接口"""
    
    @stock_ns.doc('get_stock_quote')
    @stock_ns.response(200, '成功', success_response_model)
    @stock_ns.response(404, '股票不存在', error_response_model)
    @stock_ns.response(500, '服务器错误', error_response_model)
    def get(self, code: str):
        """获取股票行情
        
        获取指定股票的实时行情数据，包括价格、涨跌幅、成交量等
        """
        trace_id = generate_trace_id()
        
        try:
            quote = stock_service.generate_stock_quote(code)
            
            return {
                'code': 0,
                'message': 'success',
                'data': quote,
                'trace_id': trace_id
            }
        except Exception as e:
            return {
                'code': 500,
                'message': f'获取行情失败: {str(e)}',
                'data': None,
                'trace_id': trace_id
            }, 500


@stock_ns.route('/<string:code>/financial')
@stock_ns.param('code', '股票代码，如 600519.SH')
class StockFinancial(Resource):
    """股票财务指标接口"""
    
    @stock_ns.doc('get_stock_financial')
    @stock_ns.response(200, '成功', success_response_model)
    @stock_ns.response(404, '股票不存在', error_response_model)
    @stock_ns.response(500, '服务器错误', error_response_model)
    def get(self, code: str):
        """获取股票财务指标
        
        获取指定股票的关键财务指标，包括ROE、PE、PB等
        """
        trace_id = generate_trace_id()
        
        try:
            financial = stock_service.generate_financial_indicators(code)
            
            return {
                'code': 0,
                'message': 'success',
                'data': financial,
                'trace_id': trace_id
            }
        except Exception as e:
            return {
                'code': 500,
                'message': f'获取财务指标失败: {str(e)}',
                'data': None,
                'trace_id': trace_id
            }, 500


@stock_ns.route('/<string:code>/full')
@stock_ns.param('code', '股票代码，如 600519.SH')
class StockFull(Resource):
    """股票完整数据接口"""
    
    @stock_ns.doc('get_stock_full')
    @stock_ns.response(200, '成功', success_response_model)
    @stock_ns.response(404, '股票不存在', error_response_model)
    @stock_ns.response(500, '服务器错误', error_response_model)
    def get(self, code: str):
        """获取股票完整数据
        
        包含基本信息、行情、财务、公司信息、技术指标、历史行情、同业对比
        """
        trace_id = generate_trace_id()
        
        try:
            full_data = stock_service.generate_full_data(code)
            
            return {
                'code': 0,
                'message': 'success',
                'data': full_data,
                'trace_id': trace_id
            }
        except Exception as e:
            return {
                'code': 500,
                'message': f'获取股票数据失败: {str(e)}',
                'data': None,
                'trace_id': trace_id
            }, 500
