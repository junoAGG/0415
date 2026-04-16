"""
研报管理 API - Flask-RESTX 命名空间
提供Swagger文档支持
"""
import os
import uuid
import json
import logging
import csv
import io
from datetime import datetime
from flask import request, current_app, send_file, send_from_directory, Response, stream_with_context
from flask_restx import Namespace, Resource, fields, reqparse
from werkzeug.utils import secure_filename

from storage.report_storage import ReportStorage
from storage.file_storage import FileStorage
from storage.chat_storage import ChatStorage
from services.parser import ReportParser
from services.ai_service import ai_service
from services.report_fetcher import report_fetcher
import mimetypes

# 配置日志
logger = logging.getLogger(__name__)

# 创建命名空间
agent_ns = Namespace('agent', description='研报管理相关接口')

# 初始化存储
report_storage = ReportStorage()
file_storage = FileStorage()
chat_storage = ChatStorage()
parser = ReportParser()


def generate_trace_id():
    """生成追踪ID"""
    return str(uuid.uuid4())[:12]


def create_error_response(code: str, message: str, details: str = None, status_code: int = 400):
    """创建统一错误响应
    
    Args:
        code: 错误码
        message: 错误信息
        details: 详细错误信息（可选）
        status_code: HTTP状态码
        
    Returns:
        (响应字典, HTTP状态码) 元组
    """
    response = {
        'error': {
            'code': code,
            'message': message,
        },
        'trace_id': generate_trace_id()
    }
    if details:
        response['error']['details'] = details
    return response, status_code


def log_request(endpoint: str, method: str, start_time: float = None, status: str = 'success', error: str = None):
    """记录请求日志
    
    Args:
        endpoint: 端点名称
        method: HTTP方法
        start_time: 请求开始时间（用于计算耗时）
        status: 请求状态
        error: 错误信息
    """
    elapsed = None
    if start_time:
        elapsed = (datetime.now().timestamp() - start_time) * 1000  # 毫秒
    
    log_data = {
        'endpoint': endpoint,
        'method': method,
        'status': status,
    }
    if elapsed is not None:
        log_data['elapsed_ms'] = round(elapsed, 2)
    if error:
        log_data['error'] = error
    
    if status == 'error':
        logger.error(f"Request log: {json.dumps(log_data, ensure_ascii=False)}")
    else:
        logger.info(f"Request log: {json.dumps(log_data, ensure_ascii=False)}")


class PromptTemplates:
    """提示词模板类 - 集中管理所有提示词模板"""
    
    # 对比分析提示词模板
    COMPARE_PROMPT_TEMPLATE = """请对以下{report_count}份研报进行{compare_type_name}对比分析。

{reports_info}

请按以下格式输出分析结果，使用 ### 作为各部分的分隔符：

###分析总结
（总体对比分析的总结，200字以内）

###共同点
1. （共同点1）
2. （共同点2）
3. （共同点3）

###差异点
1. （差异点1）
2. （差异点2）
3. （差异点3）

###投资建议
1. （建议1）
2. （建议2）
3. （建议3）
{dimensions_section}"""

    # 对比分析维度模板
    COMPARE_DIMENSION_TEMPLATE = """
此外，请针对以下维度分别进行详细分析，每个维度输出总结和要点：

{dimensions_detail}
每个维度请按如下格式输出：
###维度-维度名称
总结：（一句话总结）
1. （要点1）
2. （要点2）
3. （要点3）
"""

    # 问答提示词模板
    QUERY_PROMPT_TEMPLATE = """你是一位专业的证券分析师，请基于以下研报内容回答问题。

【参考研报】
{reports_info}

【研报摘要信息】
{reports_summary}

【用户问题】
{question}

请基于以上研报内容，给出专业、准确的回答。如果研报中没有相关信息，请明确说明。

回答要求：
1. 基于研报事实，不要编造信息
2. 如果涉及数据，请引用具体数值
3. 如果有多份研报，请综合对比分析
4. 如有风险提示，请明确说明"""

    # 研报信息模板
    REPORT_INFO_TEMPLATE = """
研报{index}: {title}
公司: {company} ({company_code})
券商: {broker}
分析师: {analyst}
评级: {rating}
目标价: {target_price}
核心观点: {core_views}
{additional_info}"""

    # 维度定义
    DIMENSION_DEFINITIONS = {
        'rating': {
            'label': '投资评级',
            'prompt': '对比各研报的投资评级、目标价、评级变化，总结评级异同，列出3条要点'
        },
        'financial': {
            'label': '财务预测',
            'prompt': '对比各研报的营收/净利润/EPS预测、盈利能力、成长性、估值指标，总结财务预测异同，列出3条要点'
        },
        'views': {
            'label': '核心观点',
            'prompt': '对比各研报的核心观点、投资逻辑、风险提示，总结观点异同，列出3条要点'
        },
        'analyst': {
            'label': '券商分析师',
            'prompt': '对比不同券商/分析师的视角差异、分歧焦点、推荐力度，总结分析师观点差异，列出3条要点'
        }
    }
    
    @classmethod
    def build_compare_prompt(cls, reports: list, compare_type: str, dimensions: list = None) -> str:
        """构建对比分析提示词
        
        Args:
            reports: 研报列表
            compare_type: 对比类型 (company/industry/custom)
            dimensions: 对比维度列表
            
        Returns:
            构建好的提示词
        """
        type_names = {
            'company': '公司',
            'industry': '行业',
            'custom': '综合'
        }
        
        # 构建研报信息
        reports_info = ''
        for i, report in enumerate(reports, 1):
            reports_info += cls._build_single_report_info(i, report)
        
        # 构建维度部分
        dimensions_section = ''
        if dimensions:
            dimensions_detail = ''
            for dim in dimensions:
                dim_def = cls.DIMENSION_DEFINITIONS.get(dim, {'label': dim, 'prompt': ''})
                dimensions_detail += f"\n###维度-{dim_def['label']}\n（{dim_def['prompt']}）\n"
            dimensions_section = cls.COMPARE_DIMENSION_TEMPLATE.format(
                dimensions_detail=dimensions_detail
            )
        
        return cls.COMPARE_PROMPT_TEMPLATE.format(
            report_count=len(reports),
            compare_type_name=type_names.get(compare_type, '综合'),
            reports_info=reports_info,
            dimensions_section=dimensions_section
        )
    
    @classmethod
    def _build_single_report_info(cls, index: int, report: dict) -> str:
        """构建单份研报信息"""
        additional_info = ''
        
        # 投资评级
        investment_rating = report.get('investment_rating', {})
        if investment_rating:
            additional_info += f"投资建议: {investment_rating.get('recommendation', '-')}\n"
        
        # 盈利能力
        profitability = report.get('profitability', {})
        if profitability:
            additional_info += f"盈利能力: 营收{profitability.get('revenue', '-')}亿, 毛利率{profitability.get('gross_margin', '-')}%, 净利率{profitability.get('net_margin', '-')}%, ROE{profitability.get('roe', '-')}%\n"
        
        # 成长性
        growth = report.get('growth', {})
        if growth:
            additional_info += f"成长性: 营收增速{growth.get('revenue_growth', '-')}%, 利润增速{growth.get('profit_growth', '-')}%, 3年CAGR{growth.get('cagr_3y', '-')}%\n"
        
        # 估值
        valuation = report.get('valuation', {})
        if valuation:
            additional_info += f"估值: PE-TTM {valuation.get('pe_ttm', '-')}, PB {valuation.get('pb', '-')}, PEG {valuation.get('peg', '-')}, EV/EBITDA {valuation.get('ev_ebitda', '-')}\n"
        
        # 偿债能力
        solvency = report.get('solvency', {})
        if solvency:
            additional_info += f"偿债能力: 资产负债率{solvency.get('debt_to_asset', '-')}%, 流动比率{solvency.get('current_ratio', '-')}\n"
        
        # 现金流
        cashflow = report.get('cashflow', {})
        if cashflow:
            additional_info += f"现金流: 经营性{cashflow.get('operating_cashflow', '-')}亿, 自由现金流{cashflow.get('free_cashflow', '-')}亿\n"
        
        # 财务预测
        if report.get('financial_forecast'):
            additional_info += f"财务预测: {str(report['financial_forecast'])}\n"
        
        return cls.REPORT_INFO_TEMPLATE.format(
            index=index,
            title=report.get('title', '未命名'),
            company=report.get('company', '-'),
            company_code=report.get('company_code', '-'),
            broker=report.get('broker', '-'),
            analyst=report.get('analyst', '-'),
            rating=report.get('rating', '-'),
            target_price=report.get('target_price', '-'),
            core_views=report.get('core_views', '-'),
            additional_info=additional_info
        )
    
    @classmethod
    def build_query_prompt(cls, question: str, reports: list) -> str:
        """构建问答提示词
        
        Args:
            question: 用户问题
            reports: 研报列表
            
        Returns:
            构建好的提示词
        """
        # 构建研报信息
        reports_info = ''
        for i, report in enumerate(reports, 1):
            reports_info += cls._build_single_report_info(i, report)
        
        # 构建摘要信息
        reports_summary = cls._build_reports_summary(reports)
        
        return cls.QUERY_PROMPT_TEMPLATE.format(
            reports_info=reports_info,
            reports_summary=reports_summary,
            question=question
        )
    
    @classmethod
    def _build_reports_summary(cls, reports: list) -> str:
        """构建研报摘要信息"""
        if not reports:
            return '无参考研报'
        
        summary_parts = []
        
        # 统计信息
        companies = list(set([r.get('company', '') for r in reports if r.get('company')]))
        brokers = list(set([r.get('broker', '') for r in reports if r.get('broker')]))
        ratings = list(set([r.get('rating', '') for r in reports if r.get('rating')]))
        
        summary_parts.append(f"涉及公司: {', '.join(companies) if companies else '未指定'}")
        summary_parts.append(f"券商来源: {', '.join(brokers) if brokers else '未指定'}")
        summary_parts.append(f"评级分布: {', '.join(ratings) if ratings else '未指定'}")
        
        # 价格区间
        target_prices = [r.get('target_price') for r in reports if r.get('target_price')]
        if target_prices:
            summary_parts.append(f"目标价区间: {min(target_prices)} - {max(target_prices)}")
        
        return '\n'.join(summary_parts)


# ============ API Models (用于Swagger文档) ============

# 投资评级模型
investment_rating_model = agent_ns.model('InvestmentRating', {
    'recommendation': fields.String(description='投资建议', example='建议买入', enum=['强烈建议买入', '建议买入', '建议观望', '建议卖出']),
    'change': fields.String(description='评级变化', example='维持'),
    'time_horizon': fields.String(description='投资期限', example='12个月'),
})

# 盈利能力模型
profitability_model = agent_ns.model('Profitability', {
    'revenue': fields.Float(description='营业收入(亿元)', example=1000.5),
    'net_profit': fields.Float(description='净利润(亿元)', example=150.3),
    'gross_margin': fields.Float(description='毛利率(%)', example=35.5),
    'net_margin': fields.Float(description='净利率(%)', example=15.0),
    'roe': fields.Float(description='ROE(%)', example=18.5),
    'roa': fields.Float(description='ROA(%)', example=10.2),
    'roic': fields.Float(description='ROIC(%)', example=12.8),
})

# 成长性模型
growth_model = agent_ns.model('Growth', {
    'revenue_growth': fields.Float(description='营收增速(%)', example=25.5),
    'profit_growth': fields.Float(description='净利润增速(%)', example=30.2),
    'net_profit_growth': fields.Float(description='归母净利润增速(%)', example=28.5),
    'cagr_3y': fields.Float(description='3年复合增速(%)', example=20.0),
    'cagr_5y': fields.Float(description='5年复合增速(%)', example=18.5),
})

# 估值模型
valuation_model = agent_ns.model('Valuation', {
    'pe_ttm': fields.Float(description='PE-TTM', example=25.5),
    'pe_2024': fields.Float(description='2024年PE', example=22.0),
    'pe_2025': fields.Float(description='2025年PE', example=18.5),
    'pb': fields.Float(description='PB', example=3.2),
    'ps': fields.Float(description='PS', example=5.5),
    'peg': fields.Float(description='PEG', example=1.2),
    'ev_ebitda': fields.Float(description='EV/EBITDA', example=15.5),
})

# 偿债能力模型
solvency_model = agent_ns.model('Solvency', {
    'debt_to_asset': fields.Float(description='资产负债率(%)', example=45.5),
    'current_ratio': fields.Float(description='流动比率', example=1.8),
    'quick_ratio': fields.Float(description='速动比率', example=1.5),
    'interest_coverage': fields.Float(description='利息保障倍数', example=12.5),
})

# 现金流模型
cashflow_model = agent_ns.model('Cashflow', {
    'operating_cashflow': fields.Float(description='经营性现金流(亿元)', example=200.5),
    'free_cashflow': fields.Float(description='自由现金流(亿元)', example=120.3),
    'cashflow_per_share': fields.Float(description='每股现金流(元)', example=5.5),
    'operating_cashflow_margin': fields.Float(description='现金流利润率(%)', example=25.0),
})

# 研报基础模型
report_base_model = agent_ns.model('ReportBase', {
    'id': fields.String(description='研报ID', example='rep_abc123'),
    'title': fields.String(description='研报标题', example='某公司2024年深度研究报告'),
    'company': fields.String(description='公司名称', example='某科技公司'),
    'company_code': fields.String(description='股票代码', example='600000.SH'),
    'broker': fields.String(description='券商名称', example='某证券'),
    'analyst': fields.String(description='分析师', example='张三'),
    'rating': fields.String(description='评级', example='买入'),
    'target_price': fields.Float(description='目标价', example=50.5),
    'current_price': fields.Float(description='当前价', example=45.0),
    'file_type': fields.String(description='文件类型', example='pdf'),
    'file_size': fields.Integer(description='文件大小(字节)', example=1024000),
    'status': fields.String(description='状态', example='completed', enum=['pending', 'parsing', 'completed', 'failed']),
    'source': fields.String(description='来源', example='upload', enum=['upload', 'fetch', 'ai']),
    'created_at': fields.String(description='创建时间', example='2024-01-15T10:30:00'),
    'updated_at': fields.String(description='更新时间', example='2024-01-15T10:35:00'),
})

# 研报详情模型
report_detail_model = agent_ns.inherit('ReportDetail', report_base_model, {
    'core_views': fields.String(description='核心观点'),
    'financial_forecast': fields.Raw(description='财务预测数据'),
    'investment_rating': fields.Nested(investment_rating_model, description='投资评级建议'),
    'profitability': fields.Nested(profitability_model, description='盈利能力指标'),
    'growth': fields.Nested(growth_model, description='成长性指标'),
    'valuation': fields.Nested(valuation_model, description='估值指标'),
    'solvency': fields.Nested(solvency_model, description='偿债能力指标'),
    'cashflow': fields.Nested(cashflow_model, description='现金流指标'),
    'content': fields.String(description='研报原文内容'),
    'parse_error': fields.String(description='解析错误信息'),
    'filename': fields.String(description='文件名'),
    'file_path': fields.String(description='文件路径'),
})

# 上传响应模型
uploaded_file_model = agent_ns.model('UploadedFile', {
    'id': fields.String(description='研报ID'),
    'filename': fields.String(description='文件名'),
    'status': fields.String(description='状态'),
})

failed_file_model = agent_ns.model('FailedFile', {
    'filename': fields.String(description='文件名'),
    'error': fields.String(description='错误信息'),
})

upload_response_model = agent_ns.model('UploadResponse', {
    'uploaded': fields.List(fields.Nested(uploaded_file_model)),
    'failed': fields.List(fields.Nested(failed_file_model)),
})

# 列表响应模型
pagination_model = agent_ns.model('Pagination', {
    'items': fields.List(fields.Nested(report_base_model)),
    'total': fields.Integer(description='总数'),
    'page': fields.Integer(description='当前页码'),
    'page_size': fields.Integer(description='每页数量'),
    'total_pages': fields.Integer(description='总页数'),
})

# 标准响应模型
success_response_model = agent_ns.model('SuccessResponse', {
    'code': fields.Integer(description='状态码', example=0),
    'message': fields.String(description='消息', example='success'),
    'data': fields.Raw(description='数据'),
    'trace_id': fields.String(description='追踪ID'),
})

error_response_model = agent_ns.model('ErrorResponse', {
    'code': fields.String(description='错误码'),
    'message': fields.String(description='错误信息'),
    'data': fields.Raw(description='数据'),
    'trace_id': fields.String(description='追踪ID'),
})


# ============ Request Parsers ============

# 列表查询参数
list_parser = reqparse.RequestParser()
list_parser.add_argument('page', type=int, default=1, help='页码', location='args')
list_parser.add_argument('page_size', type=int, default=20, help='每页数量', location='args')
list_parser.add_argument('search', type=str, help='搜索关键词', location='args')
list_parser.add_argument('sort_by', type=str, default='created_at', help='排序字段', location='args')
list_parser.add_argument('filter_status', type=str, default='all', help='状态筛选', location='args')


# ============ API Resources ============

@agent_ns.route('/reports/upload')
class ReportUpload(Resource):
    """研报上传接口"""
    
    @agent_ns.doc('upload_report')
    @agent_ns.expect(agent_ns.parser().add_argument('files', type='File', required=True, help='PDF/HTML文件', location='files', action='append'))
    @agent_ns.response(200, '上传成功', success_response_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    def post(self):
        """
        上传研报文件
        
        支持PDF/HTML格式，单次最多上传10个文件，每个文件最大50MB
        """
        if 'files' not in request.files:
            return {'code': 'EMPTY_FILE', 'message': '请选择要上传的文件', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        files = request.files.getlist('files')
        
        if not files or files[0].filename == '':
            return {'code': 'EMPTY_FILE', 'message': '请选择要上传的文件', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        if len(files) > 10:
            return {'code': 'TOO_MANY_FILES', 'message': '一次最多上传10个文件', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        uploaded = []
        failed = []
        
        for file_obj in files:
            # 保留原始文件名（含中文）用于标题提取和类型检查
            # secure_filename 会过滤中文字符导致文件名为空，上传失败
            raw_name = file_obj.filename or ''
            # 仅去除路径部分，防止路径穿越
            original_filename = raw_name.replace('\\', '/').rsplit('/', 1)[-1].strip()
            if not original_filename:
                original_filename = f'upload_{uuid.uuid4().hex[:8]}.pdf'
            
            # 保存文件
            result = file_storage.save(file_obj, original_filename)
            
            if not result['success']:
                failed.append({
                    'filename': original_filename,
                    'error': result['error']
                })
                continue
            
            # 创建研报记录
            file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            
            report = report_storage.create({
                'title': original_filename.rsplit('.', 1)[0],
                'file_path': result['file_path'],
                'filename': result['filename'],
                'file_type': file_ext,
                'file_size': result['file_size'],
                'status': 'pending'
            })
            
            uploaded.append({
                'id': report['id'],
                'filename': original_filename,
                'status': 'pending'
            })
            
            # 同步解析
            try:
                parse_result = parser.parse(result['file_path'], file_ext)
                
                if parse_result['success']:
                    data = parse_result['data']
                    report_storage.update(report['id'], {
                        'status': 'completed',
                        'title': data.get('title', report['title']),
                        'company': data.get('company', ''),
                        'company_code': data.get('company_code', ''),
                        'broker': data.get('broker', ''),
                        'analyst': data.get('analyst', ''),
                        'rating': data.get('rating', ''),
                        'target_price': data.get('target_price'),
                        'current_price': data.get('current_price'),
                        'core_views': data.get('core_views', ''),
                        'financial_forecast': data.get('financial_forecast', {}),
                        'investment_rating': data.get('investment_rating', {}),
                        'profitability': data.get('profitability', {}),
                        'growth': data.get('growth', {}),
                        'valuation': data.get('valuation', {}),
                        'solvency': data.get('solvency', {}),
                        'cashflow': data.get('cashflow', {}),
                    })
                else:
                    report_storage.update(report['id'], {
                        'status': 'failed',
                        'parse_error': parse_result['error']
                    })
            except Exception as e:
                report_storage.update(report['id'], {
                    'status': 'failed',
                    'parse_error': str(e)
                })
        
        return {
            'code': 0,
            'message': f'成功上传 {len(uploaded)} 个文件，失败 {len(failed)} 个',
            'data': {
                'uploaded': uploaded,
                'failed': failed
            },
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/reports')
class ReportList(Resource):
    """研报列表接口"""
    
    @agent_ns.doc('list_reports')
    @agent_ns.expect(list_parser)
    @agent_ns.response(200, '查询成功', success_response_model)
    def get(self):
        """
        获取研报列表
        
        支持分页、搜索、排序和状态筛选
        """
        args = list_parser.parse_args()
        page = args.get('page', 1)
        page_size = args.get('page_size', 20)
        search = args.get('search')
        sort_by = args.get('sort_by', 'created_at')
        filter_status = args.get('filter_status', 'all')
        
        # 参数校验
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
        
        result = report_storage.list(
            page=page,
            page_size=page_size,
            search=search,
            sort_by=sort_by,
            filter_status=filter_status
        )
        
        return {
            'code': 0,
            'message': 'success',
            'data': result,
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/reports/<string:report_id>')
@agent_ns.param('report_id', '研报ID')
class ReportDetail(Resource):
    """研报详情接口"""
    
    @agent_ns.doc('get_report')
    @agent_ns.response(200, '查询成功', success_response_model)
    @agent_ns.response(404, '研报不存在', error_response_model)
    def get(self, report_id):
        """
        获取研报详情
        
        根据研报ID获取详细信息
        """
        report = report_storage.get(report_id)
        
        if not report:
            return {'code': 'REPORT_NOT_FOUND', 'message': '研报不存在或已删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        return {
            'code': 0,
            'message': 'success',
            'data': report,
            'trace_id': generate_trace_id()
        }
    
    @agent_ns.doc('delete_report')
    @agent_ns.response(200, '删除成功', success_response_model)
    @agent_ns.response(404, '研报不存在', error_response_model)
    def delete(self, report_id):
        """
        删除研报
        
        删除指定研报及其关联文件
        """
        report = report_storage.get(report_id)
        
        if not report:
            return {'code': 'REPORT_NOT_FOUND', 'message': '研报不存在或已删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        # 删除文件
        if report.get('filename'):
            file_storage.delete(report['filename'])
        
        # 删除记录
        report_storage.delete(report_id)
        
        return {
            'code': 0,
            'message': '删除成功',
            'data': None,
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/reports/<string:report_id>/reparse')
@agent_ns.param('report_id', '研报ID')
class ReportReparse(Resource):
    """研报重新解析接口"""
    
    @agent_ns.doc('reparse_report')
    @agent_ns.response(200, '解析成功', success_response_model)
    @agent_ns.response(404, '研报不存在', error_response_model)
    @agent_ns.response(422, '解析失败', error_response_model)
    def post(self, report_id):
        """
        重新解析研报
        
        对已有研报文件重新进行解析
        """
        report = report_storage.get(report_id)
        
        if not report:
            return {'code': 'REPORT_NOT_FOUND', 'message': '研报不存在或已删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        # 更新状态为解析中
        report_storage.update(report_id, {'status': 'parsing'})
        
        try:
            parse_result = parser.parse(report['file_path'], report['file_type'])
            
            if parse_result['success']:
                data = parse_result['data']
                updated = report_storage.update(report_id, {
                    'status': 'completed',
                    'title': data.get('title', report['title']),
                    'company': data.get('company', ''),
                    'company_code': data.get('company_code', ''),
                    'broker': data.get('broker', ''),
                    'analyst': data.get('analyst', ''),
                    'rating': data.get('rating', ''),
                    'target_price': data.get('target_price'),
                    'current_price': data.get('current_price'),
                    'core_views': data.get('core_views', ''),
                    'financial_forecast': data.get('financial_forecast', {}),
                    'investment_rating': data.get('investment_rating', {}),
                    'profitability': data.get('profitability', {}),
                    'growth': data.get('growth', {}),
                    'valuation': data.get('valuation', {}),
                    'solvency': data.get('solvency', {}),
                    'cashflow': data.get('cashflow', {}),
                })
                return {
                    'code': 0,
                    'message': '重新解析成功',
                    'data': updated,
                    'trace_id': generate_trace_id()
                }
            else:
                updated = report_storage.update(report_id, {
                    'status': 'failed',
                    'parse_error': parse_result['error']
                })
                return {'code': 'PARSE_FAILED', 'message': parse_result['error'], 'data': None, 'trace_id': generate_trace_id()}, 422
        except Exception as e:
            report_storage.update(report_id, {
                'status': 'failed',
                'parse_error': str(e)
            })
            return {'code': 'PARSE_FAILED', 'message': str(e), 'data': None, 'trace_id': generate_trace_id()}, 422


@agent_ns.route('/reports/<string:report_id>/download')
@agent_ns.param('report_id', '研报ID')
class ReportDownload(Resource):
    """研报PDF下载接口"""
    
    @agent_ns.doc('download_report')
    @agent_ns.response(200, '下载成功')
    @agent_ns.response(404, '研报不存在', error_response_model)
    def get(self, report_id):
        """
        下载研报PDF文件
        
        返回PDF文件流，支持浏览器下载
        """
        report = report_storage.get(report_id)
        
        if not report:
            return {'code': 'REPORT_NOT_FOUND', 'message': '研报不存在或已删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        filename = report.get('filename')
        if not filename:
            return {'code': 'FILE_NOT_FOUND', 'message': '文件不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        filepath = file_storage.get(filename)
        if not filepath or not os.path.exists(filepath):
            return {'code': 'FILE_NOT_FOUND', 'message': '文件不存在或已被删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        # 设置下载文件名
        download_name = f"{report.get('company', '研报')}_{report.get('broker', '')}_{report.get('title', '未命名')[:20]}.pdf"
        
        return send_file(
            filepath,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name
        )


@agent_ns.route('/reports/<string:report_id>/preview')
@agent_ns.param('report_id', '研报ID')
class ReportPreview(Resource):
    """研报PDF在线预览接口"""
    
    @agent_ns.doc('preview_report')
    @agent_ns.response(200, '预览成功')
    @agent_ns.response(404, '研报不存在', error_response_model)
    def get(self, report_id):
        """
        在线预览研报PDF文件
        
        返回PDF文件流，支持浏览器内嵌预览
        """
        report = report_storage.get(report_id)
        
        if not report:
            return {'code': 'REPORT_NOT_FOUND', 'message': '研报不存在或已删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        filename = report.get('filename')
        if not filename:
            return {'code': 'FILE_NOT_FOUND', 'message': '文件不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        filepath = file_storage.get(filename)
        if not filepath or not os.path.exists(filepath):
            return {'code': 'FILE_NOT_FOUND', 'message': '文件不存在或已被删除', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        # 获取文件mime类型
        mime_type, _ = mimetypes.guess_type(filepath)
        if not mime_type:
            mime_type = 'application/pdf'
        
        return send_file(
            filepath,
            mimetype=mime_type,
            as_attachment=False  # 不强制下载，支持浏览器预览
        )


@agent_ns.route('/ai-status')
class AIStatus(Resource):
    """AI服务状态检查接口"""
    
    @agent_ns.doc('check_ai_status')
    @agent_ns.response(200, '查询成功', success_response_model)
    def get(self):
        """
        检查AI服务连接状态
        
        检测百炼API是否可正常连接
        """
        status = ai_service.check_status()
        
        return {
            'code': 0,
            'message': 'success',
            'data': {
                'status': 'connected' if status['connected'] else 'disconnected',
                'connected': status['connected'],
                'message': status['message'],
                'model': status['model'],
                'service': '百炼API'
            },
            'trace_id': generate_trace_id()
        }


# 研报抓取相关模型
fetch_request_model = agent_ns.model('FetchRequest', {
    'count': fields.Integer(required=False, default=5, description='抓取数量', example=5),
    'use_ai': fields.Boolean(required=False, default=False, description='是否使用AI生成', example=False),
    'company': fields.String(required=False, description='指定公司名称', example='贵州茅台'),
})

fetch_response_model = agent_ns.model('FetchResponse', {
    'fetched': fields.Integer(description='成功抓取数量'),
    'reports': fields.List(fields.Nested(report_base_model), description='抓取的研报列表'),
})


@agent_ns.route('/reports/fetch')
class ReportFetch(Resource):
    """研报抓取接口"""
    
    @agent_ns.doc('fetch_reports')
    @agent_ns.expect(fetch_request_model)
    @agent_ns.response(200, '抓取成功', success_response_model)
    def post(self):
        """
        抓取研报数据
        
        通过百炼API自动抓取或生成研报数据
        """
        data = request.get_json() or {}
        count = data.get('count', 5)
        use_ai = data.get('use_ai', False)
        company = data.get('company', None)
        
        # 限制抓取数量
        if count < 1:
            count = 1
        if count > 20:
            count = 20
        
        fetched_reports = []
        
        if company and use_ai:
            # 使用AI生成指定公司的研报
            report = report_fetcher.fetch_with_ai(company)
            if report:
                report['source'] = 'ai'  # 标记为AI生成
                # 保存到存储
                saved = report_storage.create(report)
                fetched_reports.append(saved)
        else:
            # 获取现有研报的公司列表，用于去重
            existing_reports = report_storage.list(page_size=1000)
            existing_companies = list(set([r['company'] for r in existing_reports['items'] if r.get('company')]))
            
            # 批量抓取研报（去重拉新）
            reports = report_fetcher.fetch_reports(count, existing_companies)
            for report in reports:
                report['source'] = 'fetch'  # 标记为自动抓取
                # 保存到存储
                saved = report_storage.create(report)
                fetched_reports.append(saved)
        
        return {
            'code': 0,
            'message': f'成功抓取 {len(fetched_reports)} 份研报',
            'data': {
                'fetched': len(fetched_reports),
                'reports': fetched_reports
            },
            'trace_id': generate_trace_id()
        }


# 分析相关模型
compare_request_model = agent_ns.model('CompareRequest', {
    'report_ids': fields.List(fields.String, required=True, description='研报ID列表'),
    'compare_type': fields.String(required=True, description='对比类型', enum=['company', 'industry', 'custom']),
    'dimensions': fields.List(fields.String, required=False, description='对比维度列表', example=['rating', 'financial', 'views', 'analyst']),
})

dimension_result_model = agent_ns.model('DimensionResult', {
    'dimension': fields.String(description='维度标识'),
    'dimension_label': fields.String(description='维度中文名'),
    'summary': fields.String(description='维度分析总结'),
    'details': fields.List(fields.String, description='维度分析详情'),
})

compare_response_model = agent_ns.model('CompareResponse', {
    'comparison_result': fields.String(description='对比总结'),
    'similarities': fields.List(fields.String, description='共同点'),
    'differences': fields.List(fields.String, description='差异点'),
    'recommendations': fields.List(fields.String, description='投资建议'),
    'dimension_results': fields.List(fields.Nested(dimension_result_model), description='按维度分析结果'),
})

query_request_model = agent_ns.model('QueryRequest', {
    'question': fields.String(required=True, description='问题'),
    'report_ids': fields.List(fields.String, description='参考研报ID列表'),
    'context': fields.String(description='额外上下文'),
})

source_model = agent_ns.model('Source', {
    'report_id': fields.String(description='研报ID'),
    'report_title': fields.String(description='研报标题'),
    'excerpt': fields.String(description='引用片段'),
})

query_response_model = agent_ns.model('QueryResponse', {
    'answer': fields.String(description='回答内容'),
    'sources': fields.List(fields.Nested(source_model), description='参考来源'),
    'confidence': fields.Float(description='置信度'),
})


# 对比分析结果缓存（简单内存缓存）
_compare_cache = {}


def _get_cache_key(report_ids: list, compare_type: str, dimensions: list) -> str:
    """生成缓存键"""
    ids_str = ','.join(sorted(report_ids))
    dims_str = ','.join(sorted(dimensions)) if dimensions else ''
    return f"{ids_str}|{compare_type}|{dims_str}"


@agent_ns.route('/analysis/compare')
class AnalysisCompare(Resource):
    """研报对比分析接口"""
    
    @agent_ns.doc('compare_reports')
    @agent_ns.expect(compare_request_model)
    @agent_ns.response(200, '分析成功', success_response_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    @agent_ns.response(500, 'AI服务错误', error_response_model)
    def post(self):
        """
        对比分析多份研报
        
        使用AI对选中的研报进行对比分析，找出共同点和差异
        """
        start_time = datetime.now().timestamp()
        
        try:
            data = request.get_json()
            report_ids = data.get('report_ids', [])
            compare_type = data.get('compare_type', 'company')
            dimensions = data.get('dimensions', [])
            
            if len(report_ids) < 2:
                log_request('/analysis/compare', 'POST', start_time, 'error', '请至少选择2份研报')
                return create_error_response('INVALID_PARAMS', '请至少选择2份研报', status_code=400)
            
            # 获取研报详情
            reports = []
            for rid in report_ids:
                report = report_storage.get(rid)
                if report:
                    reports.append(report)
            
            if len(reports) < 2:
                log_request('/analysis/compare', 'POST', start_time, 'error', '有效的研报数量不足')
                return create_error_response('INVALID_PARAMS', '有效的研报数量不足', status_code=400)
            
            # 构建对比提示词（使用新的提示词模板）
            prompt = PromptTemplates.build_compare_prompt(reports, compare_type, dimensions)
            
            # 调用AI生成对比分析（使用30秒超时）
            ai_result = ai_service.generate_text(prompt, max_tokens=4000, timeout=30)
            
            if not ai_result['success']:
                error_code = ai_result.get('error_code', 'AI_ERROR')
                log_request('/analysis/compare', 'POST', start_time, 'error', ai_result['error'])
                return create_error_response(error_code, ai_result['error'], status_code=500)
            
            # 解析AI返回的结果（含维度）
            result = _parse_compare_result(ai_result['text'], dimensions)
            
            # 缓存结果
            cache_key = _get_cache_key(report_ids, compare_type, dimensions)
            _compare_cache[cache_key] = {
                'result': result,
                'reports': reports,
                'timestamp': datetime.now().isoformat()
            }
            
            log_request('/analysis/compare', 'POST', start_time, 'success')
            
            return {
                'code': 0,
                'message': 'success',
                'data': result,
                'trace_id': generate_trace_id()
            }
        except Exception as e:
            logger.exception("对比分析异常")
            log_request('/analysis/compare', 'POST', start_time, 'error', str(e))
            return create_error_response('INTERNAL_ERROR', '分析过程中发生错误', str(e), status_code=500)


@agent_ns.route('/analysis/query')
class AnalysisQuery(Resource):
    """AI问答接口"""
    
    @agent_ns.doc('ai_query')
    @agent_ns.expect(query_request_model)
    @agent_ns.response(200, '查询成功', success_response_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    @agent_ns.response(500, 'AI服务错误', error_response_model)
    def post(self):
        """
        AI智能问答
        
        基于研报内容进行智能问答
        """
        start_time = datetime.now().timestamp()
        
        try:
            data = request.get_json()
            question = data.get('question', '')
            report_ids = data.get('report_ids', [])
            
            if not question:
                log_request('/analysis/query', 'POST', start_time, 'error', '问题不能为空')
                return create_error_response('EMPTY_QUESTION', '问题不能为空', status_code=400)
            
            # 获取参考研报
            reports = []
            if report_ids:
                for rid in report_ids:
                    report = report_storage.get(rid)
                    if report:
                        reports.append(report)
            else:
                # 如果没有指定，使用所有已完成的研报
                all_reports = report_storage.list(page_size=100)
                reports = [r for r in all_reports['items'] if r['status'] == 'completed'][:5]
            
            # 构建问答提示词（使用新的提示词模板）
            prompt = PromptTemplates.build_query_prompt(question, reports)
            
            # 调用AI生成回答（使用30秒超时）
            ai_result = ai_service.generate_text(prompt, max_tokens=2500, timeout=30)
            
            if not ai_result['success']:
                error_code = ai_result.get('error_code', 'AI_ERROR')
                log_request('/analysis/query', 'POST', start_time, 'error', ai_result['error'])
                return create_error_response(error_code, ai_result['error'], status_code=500)
            
            # 构建响应
            result = {
                'answer': ai_result['text'],
                'sources': [{'report_id': r['id'], 'report_title': r['title'], 'excerpt': (r.get('core_views', '') or '-')[:100] + '...'} for r in reports[:3]],
                'confidence': 0.85
            }
            
            log_request('/analysis/query', 'POST', start_time, 'success')
            
            return {
                'code': 0,
                'message': 'success',
                'data': result,
                'trace_id': generate_trace_id()
            }
        except Exception as e:
            logger.exception("AI问答异常")
            log_request('/analysis/query', 'POST', start_time, 'error', str(e))
            return create_error_response('INTERNAL_ERROR', '问答过程中发生错误', str(e), status_code=500)


# ============ 流式问答请求模型 ============

stream_request_model = agent_ns.model('StreamRequest', {
    'question': fields.String(required=True, description='问题'),
    'report_ids': fields.List(fields.String, description='参考研报ID列表'),
    'session_id': fields.String(description='会话ID'),
})


@agent_ns.route('/analysis/query-stream')
class AnalysisQueryStream(Resource):
    """AI流式问答接口（SSE）"""

    @agent_ns.doc('ai_query_stream')
    @agent_ns.expect(stream_request_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    def post(self):
        """
        流式AI智能问答

        基于研报内容进行流式问答，通过SSE逐步推送回答内容
        """
        start_time = datetime.now().timestamp()
        
        try:
            data = request.get_json()
            question = data.get('question', '')
            report_ids = data.get('report_ids', [])
            session_id = data.get('session_id', '')

            if not question:
                log_request('/analysis/query-stream', 'POST', start_time, 'error', '问题不能为空')
                return create_error_response('EMPTY_QUESTION', '问题不能为空', status_code=400)

            # 会话管理：自动创建或复用会话
            if session_id:
                session = chat_storage.get_session(session_id)
                if not session:
                    session_id = ''
            if not session_id:
                session = chat_storage.create_session(
                    title=question[:30],
                    report_ids=report_ids or []
                )
                session_id = session['id']

            # 保存用户消息
            chat_storage.add_message(session_id, 'user', question)

            # 获取参考研报
            reports = []
            if report_ids:
                for rid in report_ids:
                    report = report_storage.get(rid)
                    if report:
                        reports.append(report)
            else:
                all_reports = report_storage.list(page_size=100)
                reports = [r for r in all_reports['items'] if r['status'] == 'completed'][:5]

            # 构建问答提示词（使用新的提示词模板）
            prompt = PromptTemplates.build_query_prompt(question, reports)

            # 构建来源信息
            sources = [
                {
                    'report_id': r['id'],
                    'report_title': r['title'],
                    'excerpt': (r.get('core_views', '') or '-')[:100] + '...'
                }
                for r in reports[:3]
            ]

            current_session_id = session_id

            def generate():
                full_answer = []
                client_disconnected = False
                
                try:
                    # 第一条就返回 session_id
                    payload = json.dumps({'content': '', 'done': False, 'session_id': current_session_id}, ensure_ascii=False)
                    yield f'data: {payload}\n\n'

                    for chunk in ai_service.stream_generate_text(prompt, max_tokens=2500, timeout=60):
                        # 检测客户端是否断开连接
                        if not client_disconnected:
                            try:
                                # 检查请求是否已被取消（Flask会抛出异常）
                                # 这里通过尝试yield来检测连接状态
                                pass
                            except GeneratorExit:
                                client_disconnected = True
                                logger.info("客户端断开连接，停止生成")
                                break
                        
                        if chunk.startswith('[ERROR]'):
                            error_parts = chunk[8:].split('|', 1)
                            error_msg = error_parts[0]
                            error_code = error_parts[1] if len(error_parts) > 1 else 'AI_ERROR'
                            payload = json.dumps({'content': '', 'done': False, 'error': error_msg, 'error_code': error_code}, ensure_ascii=False)
                            yield f'data: {payload}\n\n'
                            return
                        
                        if client_disconnected:
                            break
                            
                        full_answer.append(chunk)
                        payload = json.dumps({'content': chunk, 'done': False}, ensure_ascii=False)
                        yield f'data: {payload}\n\n'

                    if not client_disconnected:
                        # 保存AI回答到会话
                        answer_text = ''.join(full_answer)
                        chat_storage.add_message(current_session_id, 'assistant', answer_text, sources)

                        # 完成
                        payload = json.dumps({'content': '', 'done': True, 'sources': sources, 'session_id': current_session_id}, ensure_ascii=False)
                        yield f'data: {payload}\n\n'
                        
                        elapsed = (datetime.now().timestamp() - start_time) * 1000
                        logger.info(f"流式问答完成，session_id={current_session_id}, 耗时={elapsed:.2f}ms")
                except GeneratorExit:
                    # 客户端断开连接
                    logger.info(f"客户端断开连接，session_id={current_session_id}")
                    # 尝试保存已生成的内容
                    if full_answer:
                        try:
                            answer_text = ''.join(full_answer)
                            chat_storage.add_message(current_session_id, 'assistant', answer_text + '\n\n[用户中断]', sources)
                        except Exception as e:
                            logger.error(f"保存中断消息失败: {e}")
                    raise
                except Exception as e:
                    logger.exception("流式生成异常")
                    payload = json.dumps({'content': '', 'done': False, 'error': str(e), 'error_code': 'STREAM_ERROR'}, ensure_ascii=False)
                    yield f'data: {payload}\n\n'

            log_request('/analysis/query-stream', 'POST', start_time, 'success')
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no',
                    'Connection': 'keep-alive',
                }
            )
        except Exception as e:
            logger.exception("流式问答异常")
            log_request('/analysis/query-stream', 'POST', start_time, 'error', str(e))
            return create_error_response('INTERNAL_ERROR', '流式问答过程中发生错误', str(e), status_code=500)


# ============ 数据导出相关模型 ============

export_request_model = agent_ns.model('ExportRequest', {
    'report_ids': fields.List(fields.String, required=True, description='研报ID列表'),
    'compare_type': fields.String(required=True, description='对比类型', enum=['company', 'industry', 'custom']),
    'dimensions': fields.List(fields.String, required=False, description='对比维度列表', example=['rating', 'financial', 'views', 'analyst']),
    'format': fields.String(required=True, description='导出格式', enum=['markdown', 'json', 'csv'], default='markdown'),
})

export_response_model = agent_ns.model('ExportResponse', {
    'format': fields.String(description='导出格式'),
    'content': fields.String(description='导出内容'),
    'filename': fields.String(description='建议文件名'),
})

session_export_parser = reqparse.RequestParser()
session_export_parser.add_argument('format', type=str, default='markdown', help='导出格式', location='args')
session_export_parser.add_argument('include_sources', type=bool, default=True, help='是否包含来源', location='args')


# ============ 会话管理 API ============

session_create_model = agent_ns.model('SessionCreate', {
    'title': fields.String(description='会话标题', example='新对话'),
    'report_ids': fields.List(fields.String, description='关联研报ID列表'),
    'tags': fields.List(fields.String, description='会话标签列表', example=['重要', '待跟进']),
})

session_update_model = agent_ns.model('SessionUpdate', {
    'title': fields.String(required=False, description='会话标题'),
    'tags': fields.List(fields.String, required=False, description='会话标签列表', example=['重要', '待跟进']),
})

session_list_parser = reqparse.RequestParser()
session_list_parser.add_argument('page', type=int, default=1, help='页码', location='args')
session_list_parser.add_argument('page_size', type=int, default=20, help='每页数量', location='args')
session_list_parser.add_argument('search', type=str, help='搜索关键词', location='args')
session_list_parser.add_argument('tags', type=str, help='标签过滤（多个标签用逗号分隔）', location='args')


@agent_ns.route('/analysis/export')
class AnalysisExport(Resource):
    """对比结果导出接口"""
    
    @agent_ns.doc('export_analysis')
    @agent_ns.expect(export_request_model)
    @agent_ns.response(200, '导出成功')
    @agent_ns.response(400, '参数错误', error_response_model)
    @agent_ns.response(404, '无缓存数据', error_response_model)
    def post(self):
        """
        导出对比分析结果
        
        支持导出为 Markdown、JSON 或 CSV 格式。
        如果有缓存的对比结果直接导出，否则先执行对比再导出。
        """
        start_time = datetime.now().timestamp()
        
        try:
            data = request.get_json()
            report_ids = data.get('report_ids', [])
            compare_type = data.get('compare_type', 'company')
            dimensions = data.get('dimensions', [])
            export_format = data.get('format', 'markdown')
            
            if len(report_ids) < 2:
                return create_error_response('INVALID_PARAMS', '请至少选择2份研报', status_code=400)
            
            if export_format not in ['markdown', 'json', 'csv']:
                return create_error_response('INVALID_FORMAT', '不支持的导出格式，请选择 markdown、json 或 csv', status_code=400)
            
            # 检查缓存
            cache_key = _get_cache_key(report_ids, compare_type, dimensions)
            cached_data = _compare_cache.get(cache_key)
            
            if cached_data:
                # 使用缓存数据
                result = cached_data['result']
                reports = cached_data['reports']
                logger.info(f"使用缓存的对比结果导出，cache_key={cache_key}")
            else:
                # 没有缓存，先执行对比
                logger.info(f"无缓存数据，先执行对比分析")
                
                # 获取研报详情
                reports = []
                for rid in report_ids:
                    report = report_storage.get(rid)
                    if report:
                        reports.append(report)
                
                if len(reports) < 2:
                    return create_error_response('INVALID_PARAMS', '有效的研报数量不足', status_code=400)
                
                # 构建对比提示词
                prompt = PromptTemplates.build_compare_prompt(reports, compare_type, dimensions)
                
                # 调用AI生成对比分析
                ai_result = ai_service.generate_text(prompt, max_tokens=4000, timeout=30)
                
                if not ai_result['success']:
                    error_code = ai_result.get('error_code', 'AI_ERROR')
                    return create_error_response(error_code, ai_result['error'], status_code=500)
                
                # 解析结果
                result = _parse_compare_result(ai_result['text'], dimensions)
                
                # 缓存结果
                _compare_cache[cache_key] = {
                    'result': result,
                    'reports': reports,
                    'timestamp': datetime.now().isoformat()
                }
            
            # 根据格式导出
            if export_format == 'markdown':
                content = _export_to_markdown(result, reports, compare_type, dimensions)
                mimetype = 'text/markdown'
                filename = f"对比分析_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            elif export_format == 'json':
                content = json.dumps({
                    'export_time': datetime.now().isoformat(),
                    'compare_type': compare_type,
                    'dimensions': dimensions,
                    'reports': [{'id': r['id'], 'title': r['title'], 'company': r.get('company')} for r in reports],
                    'result': result
                }, ensure_ascii=False, indent=2)
                mimetype = 'application/json'
                filename = f"对比分析_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            else:  # csv
                content = _export_to_csv(result, reports)
                mimetype = 'text/csv'
                filename = f"对比分析_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            log_request('/analysis/export', 'POST', start_time, 'success')
            
            # 返回文件内容
            return Response(
                content,
                mimetype=mimetype,
                headers={
                    'Content-Disposition': f'attachment; filename={filename}'
                }
            )
            
        except Exception as e:
            logger.exception("导出分析结果异常")
            log_request('/analysis/export', 'POST', start_time, 'error', str(e))
            return create_error_response('INTERNAL_ERROR', '导出过程中发生错误', str(e), status_code=500)


def _export_to_markdown(result: dict, reports: list, compare_type: str, dimensions: list) -> str:
    """导出为 Markdown 格式"""
    lines = []
    
    lines.append('# 研报对比分析报告')
    lines.append('')
    lines.append(f'**生成时间**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    lines.append(f'**对比类型**: {compare_type}')
    lines.append('')
    
    lines.append('## 对比研报')
    lines.append('')
    for i, report in enumerate(reports, 1):
        lines.append(f'{i}. **{report.get("title", "未命名")}**')
        lines.append(f'   - 公司: {report.get("company", "-")} ({report.get("company_code", "-")})')
        lines.append(f'   - 券商: {report.get("broker", "-")}')
        lines.append(f'   - 分析师: {report.get("analyst", "-")}')
        lines.append(f'   - 评级: {report.get("rating", "-")}')
        lines.append('')
    
    lines.append('## 分析总结')
    lines.append('')
    lines.append(result.get('comparison_result', '无'))
    lines.append('')
    
    lines.append('## 共同点')
    lines.append('')
    for item in result.get('similarities', []):
        lines.append(f'- {item}')
    lines.append('')
    
    lines.append('## 差异点')
    lines.append('')
    for item in result.get('differences', []):
        lines.append(f'- {item}')
    lines.append('')
    
    lines.append('## 投资建议')
    lines.append('')
    for item in result.get('recommendations', []):
        lines.append(f'- {item}')
    lines.append('')
    
    # 维度分析
    if dimensions and result.get('dimension_results'):
        lines.append('## 维度分析')
        lines.append('')
        for dim_result in result.get('dimension_results', []):
            lines.append(f'### {dim_result.get("dimension_label", "未知维度")}')
            lines.append('')
            if dim_result.get('summary'):
                lines.append(f'**总结**: {dim_result["summary"]}')
                lines.append('')
            lines.append('**要点**:')
            for detail in dim_result.get('details', []):
                lines.append(f'- {detail}')
            lines.append('')
    
    return '\n'.join(lines)


def _export_to_csv(result: dict, reports: list) -> str:
    """导出为 CSV 格式"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # 写入基本信息
    writer.writerow(['对比分析报告'])
    writer.writerow(['生成时间', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow([])
    
    # 写入研报信息
    writer.writerow(['研报信息'])
    writer.writerow(['序号', '标题', '公司', '券商', '分析师', '评级'])
    for i, report in enumerate(reports, 1):
        writer.writerow([
            i,
            report.get('title', ''),
            report.get('company', ''),
            report.get('broker', ''),
            report.get('analyst', ''),
            report.get('rating', '')
        ])
    writer.writerow([])
    
    # 写入共同点
    writer.writerow(['共同点'])
    for item in result.get('similarities', []):
        writer.writerow([item])
    writer.writerow([])
    
    # 写入差异点
    writer.writerow(['差异点'])
    for item in result.get('differences', []):
        writer.writerow([item])
    writer.writerow([])
    
    # 写入投资建议
    writer.writerow(['投资建议'])
    for item in result.get('recommendations', []):
        writer.writerow([item])
    writer.writerow([])
    
    # 写入维度分析
    if result.get('dimension_results'):
        writer.writerow(['维度分析'])
        writer.writerow(['维度', '总结', '要点'])
        for dim_result in result.get('dimension_results', []):
            details = '; '.join(dim_result.get('details', []))
            writer.writerow([
                dim_result.get('dimension_label', ''),
                dim_result.get('summary', ''),
                details
            ])
    
    return output.getvalue()


@agent_ns.route('/sessions')
class SessionList(Resource):
    """会话列表接口"""

    @agent_ns.doc('list_sessions')
    @agent_ns.expect(session_list_parser)
    @agent_ns.response(200, '查询成功', success_response_model)
    def get(self):
        """获取会话列表（支持分页、搜索、标签过滤）"""
        args = session_list_parser.parse_args()
        page = args.get('page', 1)
        page_size = args.get('page_size', 20)
        search = args.get('search')
        tags_str = args.get('tags')
        
        # 解析标签
        tags = None
        if tags_str:
            tags = [t.strip() for t in tags_str.split(',') if t.strip()]
        
        # 参数校验
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
        
        result = chat_storage.list_sessions(page=page, page_size=page_size, search=search, tags=tags)
        
        return {
            'code': 0,
            'message': 'success',
            'data': result,
            'trace_id': generate_trace_id()
        }

    @agent_ns.doc('create_session')
    @agent_ns.expect(session_create_model)
    @agent_ns.response(200, '创建成功', success_response_model)
    def post(self):
        """创建新会话"""
        data = request.get_json() or {}
        title = data.get('title', '新对话')
        report_ids = data.get('report_ids', [])
        tags = data.get('tags', [])
        session = chat_storage.create_session(title=title, report_ids=report_ids, tags=tags)
        return {
            'code': 0,
            'message': 'success',
            'data': {'session': session},
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/sessions/<string:session_id>')
@agent_ns.param('session_id', '会话ID')
class SessionDetail(Resource):
    """会话详情接口"""

    @agent_ns.doc('get_session')
    @agent_ns.response(200, '查询成功', success_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def get(self, session_id):
        """获取会话详情"""
        session = chat_storage.get_session(session_id)
        if not session:
            return {'code': 'SESSION_NOT_FOUND', 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        return {
            'code': 0,
            'message': 'success',
            'data': session,
            'trace_id': generate_trace_id()
        }

    @agent_ns.doc('update_session')
    @agent_ns.expect(session_update_model)
    @agent_ns.response(200, '更新成功', success_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def put(self, session_id):
        """更新会话信息（标题和/或标签）"""
        data = request.get_json() or {}
        title = data.get('title')
        tags = data.get('tags')
        
        # 至少需要一个更新字段
        if title is None and tags is None:
            return create_error_response('INVALID_PARAMS', '请提供要更新的字段（title 或 tags）', status_code=400)
        
        result = chat_storage.update_session(session_id, title=title, tags=tags)
        if not result:
            return create_error_response('SESSION_NOT_FOUND', '会话不存在', status_code=404)
        return {
            'code': 0,
            'message': 'success',
            'data': result,
            'trace_id': generate_trace_id()
        }

    @agent_ns.doc('delete_session')
    @agent_ns.response(200, '删除成功', success_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def delete(self, session_id):
        """删除会话"""
        success = chat_storage.delete_session(session_id)
        if not success:
            return {'code': 'SESSION_NOT_FOUND', 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        return {
            'code': 0,
            'message': '删除成功',
            'data': None,
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/sessions/<string:session_id>/messages')
@agent_ns.param('session_id', '会话ID')
class SessionMessages(Resource):
    """会话消息接口"""

    @agent_ns.doc('get_session_messages')
    @agent_ns.response(200, '查询成功', success_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def get(self, session_id):
        """获取会话消息历史"""
        session = chat_storage.get_session(session_id)
        if not session:
            return create_error_response('SESSION_NOT_FOUND', '会话不存在', status_code=404)
        return {
            'code': 0,
            'message': 'success',
            'data': {'messages': session.get('messages', [])},
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/sessions/<string:session_id>/export')
@agent_ns.param('session_id', '会话ID')
class SessionExport(Resource):
    """会话导出接口"""
    
    @agent_ns.doc('export_session')
    @agent_ns.expect(session_export_parser)
    @agent_ns.response(200, '导出成功')
    @agent_ns.response(404, '会话不存在', error_response_model)
    def get(self, session_id):
        """
        导出会话记录
        
        将会话的完整对话记录导出为 Markdown 或 JSON 格式
        """
        start_time = datetime.now().timestamp()
        
        try:
            args = session_export_parser.parse_args()
            export_format = args.get('format', 'markdown')
            include_sources = args.get('include_sources', True)
            
            if export_format not in ['markdown', 'json']:
                return create_error_response('INVALID_FORMAT', '不支持的导出格式，请选择 markdown 或 json', status_code=400)
            
            # 获取会话
            session = chat_storage.get_session(session_id)
            if not session:
                return create_error_response('SESSION_NOT_FOUND', '会话不存在', status_code=404)
            
            messages = session.get('messages', [])
            
            if export_format == 'markdown':
                content = _export_session_to_markdown(session, messages, include_sources)
                mimetype = 'text/markdown'
                filename = f"会话记录_{session.get('title', '未命名')[:20]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            else:  # json
                content = json.dumps({
                    'export_time': datetime.now().isoformat(),
                    'session': {
                        'id': session['id'],
                        'title': session['title'],
                        'tags': session.get('tags', []),
                        'created_at': session['created_at'],
                        'updated_at': session['updated_at'],
                    },
                    'messages': messages
                }, ensure_ascii=False, indent=2)
                mimetype = 'application/json'
                filename = f"会话记录_{session.get('title', '未命名')[:20]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            log_request('/sessions/{id}/export', 'GET', start_time, 'success')
            
            return Response(
                content,
                mimetype=mimetype,
                headers={
                    'Content-Disposition': f'attachment; filename={filename}'
                }
            )
            
        except Exception as e:
            logger.exception("导出会话异常")
            log_request('/sessions/{id}/export', 'GET', start_time, 'error', str(e))
            return create_error_response('INTERNAL_ERROR', '导出过程中发生错误', str(e), status_code=500)


def _export_session_to_markdown(session: dict, messages: list, include_sources: bool) -> str:
    """导出会话为 Markdown 格式"""
    lines = []
    
    lines.append(f'# 会话记录: {session.get("title", "未命名")}')
    lines.append('')
    lines.append(f'**会话ID**: {session["id"]}')
    lines.append(f'**创建时间**: {session.get("created_at", "-")}')
    lines.append(f'**更新时间**: {session.get("updated_at", "-")}')
    if session.get('tags'):
        lines.append(f'**标签**: {", ".join(session["tags"])}')
    lines.append(f'**导出时间**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    lines.append('')
    lines.append('---')
    lines.append('')
    
    for msg in messages:
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')
        timestamp = msg.get('timestamp', '')
        sources = msg.get('sources', [])
        
        if role == 'user':
            lines.append(f'## 👤 用户 ({timestamp})')
        else:
            lines.append(f'## 🤖 助手 ({timestamp})')
        
        lines.append('')
        lines.append(content)
        lines.append('')
        
        # 添加来源信息
        if include_sources and sources and role == 'assistant':
            lines.append('**参考来源**:')
            for src in sources:
                lines.append(f'- {src.get("report_title", "未知研报")}')
            lines.append('')
        
        lines.append('---')
        lines.append('')
    
    return '\n'.join(lines)


# 维度中文名映射
DIMENSION_LABELS = {
    'rating': '投资评级',
    'financial': '财务预测',
    'views': '核心观点',
    'analyst': '券商分析师',
}


def _build_compare_prompt(reports, compare_type, dimensions=None):
    """构建对比分析提示词（支持维度）- 使用新的模板类
    
    注意：此函数保留用于向后兼容，新代码应直接使用 PromptTemplates.build_compare_prompt
    """
    return PromptTemplates.build_compare_prompt(reports, compare_type, dimensions)


def _parse_compare_result(text, dimensions=None):
    """解析对比分析结果（含维度）"""
    result = {
        'comparison_result': '',
        'similarities': [],
        'differences': [],
        'recommendations': [],
        'dimension_results': []
    }
    
    lines = text.split('\n')
    current_section = None
    current_dim = None       # 当前正在解析的维度id
    current_dim_label = None
    current_dim_summary = ''
    current_dim_details = []
    
    def _flush_dimension():
        """将已收集的维度数据写入 result"""
        nonlocal current_dim, current_dim_label, current_dim_summary, current_dim_details
        if current_dim:
            result['dimension_results'].append({
                'dimension': current_dim,
                'dimension_label': current_dim_label or DIMENSION_LABELS.get(current_dim, current_dim),
                'summary': current_dim_summary.strip(),
                'details': current_dim_details[:],
            })
        current_dim = None
        current_dim_label = None
        current_dim_summary = ''
        current_dim_details = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 检测维度标记  【维度-投资评级】
        if line.startswith('【维度-') and line.endswith('】'):
            _flush_dimension()
            label = line[4:-1]  # 提取中文名
            # 反查维度id
            dim_id = None
            for k, v in DIMENSION_LABELS.items():
                if v == label:
                    dim_id = k
                    break
            current_dim = dim_id or label
            current_dim_label = label
            current_section = 'dimension'
            continue
        
        # 基础分段
        if '分析总结' in line and '维度' not in line:
            _flush_dimension()
            current_section = 'summary'
            continue
        elif '共同点' in line and '维度' not in line:
            _flush_dimension()
            current_section = 'similarities'
            continue
        elif '差异点' in line and '维度' not in line:
            _flush_dimension()
            current_section = 'differences'
            continue
        elif '投资建议' in line and '维度' not in line:
            _flush_dimension()
            current_section = 'recommendations'
            continue
        
        # 去除序号
        clean = line
        if clean and clean[0].isdigit() and '. ' in clean:
            clean = clean.split('. ', 1)[1]
        elif clean.startswith('- '):
            clean = clean[2:]
        
        if current_section == 'dimension' and current_dim:
            # 维度内容：总结行 vs 要点
            if clean.startswith('总结：') or clean.startswith('总结:'):
                current_dim_summary = clean.split('：', 1)[-1].split(':', 1)[-1].strip()
            else:
                current_dim_details.append(clean)
        elif current_section == 'summary':
            result['comparison_result'] += line + '\n'
        elif current_section == 'similarities' and clean:
            result['similarities'].append(clean)
        elif current_section == 'differences' and clean:
            result['differences'].append(clean)
        elif current_section == 'recommendations' and clean:
            result['recommendations'].append(clean)
    
    # 收尾
    _flush_dimension()
    result['comparison_result'] = result['comparison_result'].strip()
    return result


def _build_query_prompt(question, reports):
    """构建问答提示词 - 使用新的模板类
    
    注意：此函数保留用于向后兼容，新代码应直接使用 PromptTemplates.build_query_prompt
    """
    return PromptTemplates.build_query_prompt(question, reports)
