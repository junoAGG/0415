"""
研报管理 API - Flask-RESTX 命名空间
提供Swagger文档支持
"""
import os
import uuid
import json
from flask import request, current_app, send_file, send_from_directory, Response, stream_with_context
from flask_restx import Namespace, Resource, fields, reqparse
from werkzeug.utils import secure_filename

from storage.report_storage import ReportStorage
from storage.file_storage import FileStorage
from storage.chat_storage import ChatStorage
from services.parser import ReportParser
from services.ai_service import ai_service
from services.report_fetcher import report_fetcher
import os
import mimetypes

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


@agent_ns.route('/analysis/compare')
class AnalysisCompare(Resource):
    """研报对比分析接口"""
    
    @agent_ns.doc('compare_reports')
    @agent_ns.expect(compare_request_model)
    @agent_ns.response(200, '分析成功', success_response_model)
    def post(self):
        """
        对比分析多份研报
        
        使用AI对选中的研报进行对比分析，找出共同点和差异
        """
        data = request.get_json()
        report_ids = data.get('report_ids', [])
        compare_type = data.get('compare_type', 'company')
        dimensions = data.get('dimensions', [])
        
        if len(report_ids) < 2:
            return {'code': 'INVALID_PARAMS', 'message': '请至少选择2份研报', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        # 获取研报详情
        reports = []
        for rid in report_ids:
            report = report_storage.get(rid)
            if report:
                reports.append(report)
        
        if len(reports) < 2:
            return {'code': 'INVALID_PARAMS', 'message': '有效的研报数量不足', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        # 构建对比提示词（含维度）
        prompt = _build_compare_prompt(reports, compare_type, dimensions)
        
        # 调用AI生成对比分析
        ai_result = ai_service.generate_text(prompt, max_tokens=4000)
        
        if not ai_result['success']:
            return {'code': 'AI_ERROR', 'message': ai_result['error'], 'data': None, 'trace_id': generate_trace_id()}, 500
        
        # 解析AI返回的结果（含维度）
        result = _parse_compare_result(ai_result['text'], dimensions)
        
        return {
            'code': 0,
            'message': 'success',
            'data': result,
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/analysis/query')
class AnalysisQuery(Resource):
    """AI问答接口"""
    
    @agent_ns.doc('ai_query')
    @agent_ns.expect(query_request_model)
    @agent_ns.response(200, '查询成功', success_response_model)
    def post(self):
        """
        AI智能问答
        
        基于研报内容进行智能问答
        """
        data = request.get_json()
        question = data.get('question', '')
        report_ids = data.get('report_ids', [])
        
        if not question:
            return {'code': 'EMPTY_QUESTION', 'message': '问题不能为空', 'data': None, 'trace_id': generate_trace_id()}, 400
        
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
        
        # 构建问答提示词
        prompt = _build_query_prompt(question, reports)
        
        # 调用AI生成回答
        ai_result = ai_service.generate_text(prompt, max_tokens=2500)
        
        if not ai_result['success']:
            return {'code': 'AI_ERROR', 'message': ai_result['error'], 'data': None, 'trace_id': generate_trace_id()}, 500
        
        # 构建响应
        result = {
            'answer': ai_result['text'],
            'sources': [{'report_id': r['id'], 'report_title': r['title'], 'excerpt': r['core_views'][:100] + '...'} for r in reports[:3]],
            'confidence': 0.85
        }
        
        return {
            'code': 0,
            'message': 'success',
            'data': result,
            'trace_id': generate_trace_id()
        }


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
    def post(self):
        """
        流式AI智能问答

        基于研报内容进行流式问答，通过SSE逐步推送回答内容
        """
        data = request.get_json()
        question = data.get('question', '')
        report_ids = data.get('report_ids', [])
        session_id = data.get('session_id', '')

        if not question:
            return {'code': 'EMPTY_QUESTION', 'message': '问题不能为空', 'data': None, 'trace_id': generate_trace_id()}, 400

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

        # 构建问答提示词
        prompt = _build_query_prompt(question, reports)

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
            try:
                # 第一条就返回 session_id
                payload = json.dumps({'content': '', 'done': False, 'session_id': current_session_id}, ensure_ascii=False)
                yield f'data: {payload}\n\n'

                for chunk in ai_service.stream_generate_text(prompt, max_tokens=2500):
                    if chunk.startswith('[ERROR]'):
                        payload = json.dumps({'content': '', 'done': False, 'error': chunk[8:]}, ensure_ascii=False)
                        yield f'data: {payload}\n\n'
                        return
                    full_answer.append(chunk)
                    payload = json.dumps({'content': chunk, 'done': False}, ensure_ascii=False)
                    yield f'data: {payload}\n\n'

                # 保存AI回答到会话
                answer_text = ''.join(full_answer)
                chat_storage.add_message(current_session_id, 'assistant', answer_text, sources)

                # 完成
                payload = json.dumps({'content': '', 'done': True, 'sources': sources, 'session_id': current_session_id}, ensure_ascii=False)
                yield f'data: {payload}\n\n'
            except Exception as e:
                payload = json.dumps({'content': '', 'done': False, 'error': str(e)}, ensure_ascii=False)
                yield f'data: {payload}\n\n'

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive',
            }
        )


# ============ 会话管理 API ============

session_create_model = agent_ns.model('SessionCreate', {
    'title': fields.String(description='会话标题', example='新对话'),
    'report_ids': fields.List(fields.String, description='关联研报ID列表'),
})

session_update_model = agent_ns.model('SessionUpdate', {
    'title': fields.String(required=True, description='会话标题'),
})


@agent_ns.route('/sessions')
class SessionList(Resource):
    """会话列表接口"""

    @agent_ns.doc('list_sessions')
    @agent_ns.response(200, '查询成功', success_response_model)
    def get(self):
        """获取会话列表"""
        sessions = chat_storage.list_sessions()
        return {
            'code': 0,
            'message': 'success',
            'data': {'sessions': sessions},
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
        session = chat_storage.create_session(title=title, report_ids=report_ids)
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
        """更新会话标题"""
        data = request.get_json() or {}
        title = data.get('title')
        result = chat_storage.update_session(session_id, title=title)
        if not result:
            return {'code': 'SESSION_NOT_FOUND', 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
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
            return {'code': 'SESSION_NOT_FOUND', 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        return {
            'code': 0,
            'message': 'success',
            'data': {'messages': session.get('messages', [])},
            'trace_id': generate_trace_id()
        }


# 维度中文名映射
DIMENSION_LABELS = {
    'rating': '投资评级',
    'financial': '财务预测',
    'views': '核心观点',
    'analyst': '券商分析师',
}


def _build_compare_prompt(reports, compare_type, dimensions=None):
    """构建对比分析提示词（支持维度）"""
    type_names = {
        'company': '公司',
        'industry': '行业',
        'custom': '综合'
    }
    
    prompt = f"请对以下{len(reports)}份研报进行{type_names.get(compare_type, '综合')}对比分析。\n\n"
    
    for i, report in enumerate(reports, 1):
        prompt += f"【研报{i}】\n"
        prompt += f"标题: {report.get('title', '未命名')}\n"
        prompt += f"公司: {report.get('company', '-')} ({report.get('company_code', '-')})\n"
        prompt += f"券商: {report.get('broker', '-')}\n"
        prompt += f"分析师: {report.get('analyst', '-')}\n"
        prompt += f"评级: {report.get('rating', '-')}\n"
        prompt += f"目标价: {report.get('target_price', '-')}\n"
        prompt += f"核心观点: {report.get('core_views', '-')}\n"
        
        investment_rating = report.get('investment_rating', {})
        if investment_rating:
            prompt += f"投资建议: {investment_rating.get('recommendation', '-')}，期限{investment_rating.get('time_horizon', '-')}，变化{investment_rating.get('change', '-')}\n"
        
        profitability = report.get('profitability', {})
        if profitability:
            prompt += f"盈利能力: 营收{profitability.get('revenue', '-')}亿, 毛利率{profitability.get('gross_margin', '-')}%, 净利率{profitability.get('net_margin', '-')}%, ROE{profitability.get('roe', '-')}%\n"
        
        growth = report.get('growth', {})
        if growth:
            prompt += f"成长性: 营收增速{growth.get('revenue_growth', '-')}%, 利润增速{growth.get('profit_growth', '-')}%, 3年CAGR{growth.get('cagr_3y', '-')}%\n"
        
        valuation = report.get('valuation', {})
        if valuation:
            prompt += f"估值: PE-TTM {valuation.get('pe_ttm', '-')}, PB {valuation.get('pb', '-')}, PEG {valuation.get('peg', '-')}, EV/EBITDA {valuation.get('ev_ebitda', '-')}\n"
        
        solvency = report.get('solvency', {})
        if solvency:
            prompt += f"偿债能力: 资产负债率{solvency.get('debt_to_asset', '-')}%, 流动比率{solvency.get('current_ratio', '-')}\n"
        
        cashflow = report.get('cashflow', {})
        if cashflow:
            prompt += f"现金流: 经营性{cashflow.get('operating_cashflow', '-')}亿, 自由现金流{cashflow.get('free_cashflow', '-')}亿\n"
        
        if report.get('financial_forecast'):
            prompt += f"财务预测: {str(report['financial_forecast'])}\n"
        
        prompt += "\n"
    
    prompt += """请按以下格式输出分析结果：

【分析总结】
（总体对比分析的总结，200字以内）

【共同点】
1. （共同点1）
2. （共同点2）
3. （共同点3）

【差异点】
1. （差异点1）
2. （差异点2）
3. （差异点3）

【投资建议】
1. （建议1）
2. （建议2）
3. （建议3）
"""
    
    # 如果指定了维度，追加维度分析要求
    if dimensions:
        prompt += "\n此外，请针对以下维度分别进行详细分析，每个维度输出总结和要点：\n\n"
        for dim in dimensions:
            label = DIMENSION_LABELS.get(dim, dim)
            if dim == 'rating':
                prompt += f"【维度-{label}】\n（对比各研报的投资评级、目标价、评级变化，总结评级异同，列出3条要点）\n\n"
            elif dim == 'financial':
                prompt += f"【维度-{label}】\n（对比各研报的营收/净利润/EPS预测、盈利能力、成长性、估值指标，总结财务预测异同，列出3条要点）\n\n"
            elif dim == 'views':
                prompt += f"【维度-{label}】\n（对比各研报的核心观点、投资逻辑、风险提示，总结观点异同，列出3条要点）\n\n"
            elif dim == 'analyst':
                prompt += f"【维度-{label}】\n（对比不同券商/分析师的视角差异、分歧焦点、推荐力度，总结分析师观点差异，列出3条要点）\n\n"
        prompt += "每个维度请按如下格式输出：\n【维度-维度名称】\n总结：（一句话总结）\n1. （要点1）\n2. （要点2）\n3. （要点3）\n"
    
    return prompt


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
    """构建问答提示词"""
    prompt = "你是一位专业的证券分析师，请基于以下研报内容回答问题。\n\n"
    
    prompt += "【参考研报】\n"
    for i, report in enumerate(reports, 1):
        prompt += f"\n研报{i}: {report.get('title', '未命名')}\n"
        prompt += f"公司: {report.get('company', '-')} ({report.get('company_code', '-')})\n"
        prompt += f"核心观点: {report.get('core_views', '-')}\n"
        
        # 添加新的财务指标
        investment_rating = report.get('investment_rating', {})
        if investment_rating:
            prompt += f"投资建议: {investment_rating.get('recommendation', '-')}\n"
        
        profitability = report.get('profitability', {})
        if profitability:
            prompt += f"盈利能力: 营收{profitability.get('revenue', '-')}亿, 毛利率{profitability.get('gross_margin', '-')}%, ROE{profitability.get('roe', '-')}%\n"
        
        growth = report.get('growth', {})
        if growth:
            prompt += f"成长性: 营收增速{growth.get('revenue_growth', '-')}%, 利润增速{growth.get('profit_growth', '-')}%\n"
        
        valuation = report.get('valuation', {})
        if valuation:
            prompt += f"估值: PE-TTM {valuation.get('pe_ttm', '-')}, PB {valuation.get('pb', '-')}\n"
        
        if report.get('financial_forecast'):
            prompt += f"财务预测: {str(report['financial_forecast'])}\n"
    
    prompt += f"\n【用户问题】\n{question}\n\n"
    prompt += "请基于以上研报内容，给出专业、准确的回答。如果研报中没有相关信息，请明确说明。"
    
    return prompt
