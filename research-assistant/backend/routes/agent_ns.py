"""
研报管理 API - Flask-RESTX 命名空间
提供Swagger文档支持
"""
import os
import re
import uuid
import json
import logging
from flask import request, current_app, Response
from flask_restx import Namespace, Resource, fields, reqparse
from werkzeug.utils import secure_filename

from storage.report_storage import ReportStorage
from storage.file_storage import FileStorage
from storage import chat_storage
from services.parser import ReportParser
from services.ai_service import ai_service
from services.report_fetcher import report_fetcher

logger = logging.getLogger(__name__)

# 创建命名空间
agent_ns = Namespace('agent', description='研报管理相关接口')

# 初始化存储
report_storage = ReportStorage()
file_storage = FileStorage()
parser = ReportParser()


def generate_trace_id():
    """生成追踪ID"""
    return str(uuid.uuid4())[:12]


# ============ API Models (用于Swagger文档) ============

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
            original_filename = secure_filename(file_obj.filename)
            
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
                    report_storage.update(report['id'], {
                        'status': 'completed',
                        'title': parse_result['data'].get('title', report['title']),
                        'company': parse_result['data'].get('company', ''),
                        'company_code': parse_result['data'].get('company_code', ''),
                        'broker': parse_result['data'].get('broker', ''),
                        'analyst': parse_result['data'].get('analyst', ''),
                        'rating': parse_result['data'].get('rating', ''),
                        'target_price': parse_result['data'].get('target_price'),
                        'current_price': parse_result['data'].get('current_price'),
                        'core_views': parse_result['data'].get('core_views', ''),
                        'financial_forecast': parse_result['data'].get('financial_forecast', {}),
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
                updated = report_storage.update(report_id, {
                    'status': 'completed',
                    'title': parse_result['data'].get('title', report['title']),
                    'company': parse_result['data'].get('company', ''),
                    'company_code': parse_result['data'].get('company_code', ''),
                    'broker': parse_result['data'].get('broker', ''),
                    'analyst': parse_result['data'].get('analyst', ''),
                    'rating': parse_result['data'].get('rating', ''),
                    'target_price': parse_result['data'].get('target_price'),
                    'current_price': parse_result['data'].get('current_price'),
                    'core_views': parse_result['data'].get('core_views', ''),
                    'financial_forecast': parse_result['data'].get('financial_forecast', {}),
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
    'dimensions': fields.List(fields.String, description='对比维度列表', enum=['rating', 'financial', 'views', 'analyst']),
})

dimension_result_model = agent_ns.model('DimensionResult', {
    'dimension': fields.String(description='维度ID'),
    'dimension_label': fields.String(description='维度名称'),
    'summary': fields.String(description='维度分析总结'),
    'details': fields.List(fields.String, description='维度详细分析'),
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
        # 默认维度：如果没传，给 rating + views
        if not dimensions:
            dimensions = ['rating', 'views']
        
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
        
        # 构建对比提示词
        prompt = _build_compare_prompt(reports, compare_type, dimensions)
        
        # 调用AI生成对比分析
        ai_result = ai_service.generate_text(prompt, max_tokens=3000)
        
        if not ai_result['success']:
            return {'code': 'AI_ERROR', 'message': ai_result['error'], 'data': None, 'trace_id': generate_trace_id()}, 500
        
        # 解析AI返回的结果
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
        prompt = _build_query_prompt(question, reports, history_messages=None)
        
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


def _parse_sources_from_text(full_text, reports):
    """从 AI 回复中解析 [来源:研报标题] 标记，匹配实际研报列表
    
    如果 AI 没有在回答中标注来源，fallback 取前3份研报
    """
    sources = []
    matched_ids = set()
    
    # 解析 [来源:xxx] 标记
    citations = re.findall(r'\[来源[::：](.+?)\]', full_text)
    if citations:
        for cite in citations:
            cite = cite.strip()
            for r in reports:
                if r['id'] not in matched_ids and cite in r.get('title', ''):
                    matched_ids.add(r['id'])
                    sources.append({
                        'report_id': r['id'],
                        'report_title': r['title'],
                        'excerpt': (r.get('core_views', '') or '')[:100] + '...'
                    })
                    break
    
    # fallback: 若未匹配到任何来源，取前3份研报
    if not sources:
        for r in reports[:3]:
            sources.append({
                'report_id': r['id'],
                'report_title': r['title'],
                'excerpt': (r.get('core_views', '') or '')[:100] + '...'
            })
    
    return sources


@agent_ns.route('/analysis/query-stream')
class AnalysisQueryStream(Resource):
    """流式AI问答接口"""
    
    @agent_ns.doc('ai_query_stream')
    @agent_ns.response(200, '流式回答')
    @agent_ns.response(400, '参数错误', error_response_model)
    def post(self):
        """
        流式AI智能问答 - SSE
        
        基于研报内容进行流式智能问答，支持多轮对话上下文
        """
        data = request.get_json()
        if not data:
            return {'code': 'INVALID_PARAMS', 'message': '请求体不能为空', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        question = data.get('question', '').strip()
        report_ids = data.get('report_ids', [])
        session_id = data.get('session_id', None)
        
        if not question:
            return {'code': 'EMPTY_QUESTION', 'message': '问题不能为空', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        # --- 会话处理 ---
        history_messages = []
        created_new_session = False
        
        if session_id:
            session = chat_storage.get_session(session_id)
            if session:
                history_messages = session.get('messages', [])
            else:
                # session_id 无效，忽略并创建新会话
                session_id = None
        
        if not session_id:
            # 自动创建新会话
            title = question[:20] if len(question) > 20 else question
            new_session = chat_storage.create_session(title=title, report_ids=report_ids)
            session_id = new_session['id']
            created_new_session = True
        
        # --- 获取参考研报 ---
        reports = []
        if report_ids:
            for rid in report_ids:
                report = report_storage.get(rid)
                if report:
                    reports.append(report)
        else:
            all_reports = report_storage.list(page_size=100)
            reports = [r for r in all_reports['items'] if r['status'] == 'completed'][:5]
        
        # --- 构建 prompt ---
        prompt = _build_query_prompt(question, reports, history_messages=history_messages)
        
        # --- 存储用户消息 ---
        chat_storage.add_message(session_id, 'user', question)
        
        # --- 调用流式 AI ---
        try:
            stream_gen = ai_service.stream_generate_text(prompt, max_tokens=2500)
        except Exception as e:
            logger.error("流式 AI 服务调用失败: %s", str(e))
            return {'code': 'AI_ERROR', 'message': f'AI服务调用失败: {str(e)}', 'data': None, 'trace_id': generate_trace_id()}, 500
        
        def generate():
            full_text = ''
            try:
                # 如果是新创建的会话，先返回 session_id
                if created_new_session:
                    yield f'data: {json.dumps({"session_id": session_id, "content": "", "done": False}, ensure_ascii=False)}\n\n'
                
                for chunk in stream_gen:
                    # 检查是否为错误消息
                    if chunk.startswith('[ERROR]'):
                        error_msg = chunk[len('[ERROR]'):].strip()
                        yield f'data: {json.dumps({"content": "", "done": True, "error": error_msg}, ensure_ascii=False)}\n\n'
                        # 存储错误回复
                        chat_storage.add_message(session_id, 'assistant', f'抱歉，{error_msg}')
                        return
                    
                    full_text += chunk
                    yield f'data: {json.dumps({"content": chunk, "done": False}, ensure_ascii=False)}\n\n'
                
                # 流结束，构建来源引用
                sources = _parse_sources_from_text(full_text, reports)
                
                # 存储 AI 回复
                chat_storage.add_message(session_id, 'assistant', full_text, sources)
                
                # 发送结束事件
                yield f'data: {json.dumps({"content": "", "done": True, "sources": sources}, ensure_ascii=False)}\n\n'
                
            except Exception as e:
                logger.error("流式生成异常: %s", str(e))
                yield f'data: {json.dumps({"content": "", "done": True, "error": f"生成失败: {str(e)}"}, ensure_ascii=False)}\n\n'
                # 如果已经有部分内容，保存已生成的部分
                if full_text:
                    chat_storage.add_message(session_id, 'assistant', full_text)
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )


def _build_compare_prompt(reports, compare_type, dimensions):
    """构建对比分析提示词（按维度组织）"""
    type_names = {'company': '公司', 'industry': '行业', 'custom': '综合'}
    dim_labels = {
        'rating': '投资评级', 'financial': '财务预测',
        'views': '核心观点', 'analyst': '券商/分析师'
    }
    
    dim_desc = '、'.join([dim_labels.get(d, d) for d in dimensions])
    prompt = f"请对以下{len(reports)}份研报进行{type_names.get(compare_type, '综合')}对比分析，重点关注以下维度：{dim_desc}。\n\n"
    
    for i, report in enumerate(reports, 1):
        prompt += f"【研报{i}】\n"
        prompt += f"标题: {report.get('title', '未命名')}\n"
        prompt += f"公司: {report.get('company', '-')} ({report.get('company_code', '-')})\n"
        
        if 'rating' in dimensions:
            prompt += f"评级: {report.get('rating', '-')}\n"
            prompt += f"目标价: {report.get('target_price', '-')}\n"
            prompt += f"当前价: {report.get('current_price', '-')}\n"
        
        if 'financial' in dimensions:
            ff = report.get('financial_forecast', {})
            if ff:
                prompt += f"财务预测:\n"
                for key, val in ff.items():
                    prompt += f"  {key}: {val}\n"
        
        if 'views' in dimensions:
            prompt += f"核心观点: {report.get('core_views', '-')}\n"
        
        if 'analyst' in dimensions:
            prompt += f"券商: {report.get('broker', '-')}\n"
            prompt += f"分析师: {report.get('analyst', '-')}\n"
        
        prompt += "\n"
    
    prompt += "请按以下格式输出分析结果：\n\n"
    prompt += "【分析总结】\n（总体对比分析的总结，200字以内）\n\n"
    prompt += "【共同点】\n1. （共同点1）\n2. （共同点2）\n3. （共同点3）\n\n"
    prompt += "【差异点】\n1. （差异点1）\n2. （差异点2）\n3. （差异点3）\n\n"
    prompt += "【投资建议】\n1. （建议1）\n2. （建议2）\n3. （建议3）\n\n"
    
    for d in dimensions:
        label = dim_labels.get(d, d)
        prompt += f"【维度分析-{label}】\n"
        prompt += f"总结: （{label}维度的对比总结，100字以内）\n"
        prompt += f"1. （详细分析1）\n2. （详细分析2）\n3. （详细分析3）\n\n"
    
    return prompt


def _parse_compare_result(text, dimensions=None):
    """解析对比分析结果（含维度分析）"""
    dim_labels = {
        'rating': '投资评级', 'financial': '财务预测',
        'views': '核心观点', 'analyst': '券商/分析师'
    }
    
    result = {
        'comparison_result': '',
        'similarities': [],
        'differences': [],
        'recommendations': [],
        'dimension_results': []
    }
    
    lines = text.split('\n')
    current_section = None
    current_dim = None
    current_dim_data = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 检查维度分析段落
        dim_matched = False
        if dimensions:
            for d in dimensions:
                label = dim_labels.get(d, d)
                if f'维度分析-{label}' in line or f'维度分析_{label}' in line:
                    # 保存上一个维度
                    if current_dim_data:
                        result['dimension_results'].append(current_dim_data)
                    current_section = 'dimension'
                    current_dim = d
                    current_dim_data = {
                        'dimension': d,
                        'dimension_label': label,
                        'summary': '',
                        'details': []
                    }
                    dim_matched = True
                    break
        
        if dim_matched:
            continue
            
        if '分析总结' in line and '维度' not in line:
            current_section = 'summary'
            continue
        elif '共同点' in line:
            current_section = 'similarities'
            continue
        elif '差异点' in line:
            current_section = 'differences'
            continue
        elif '投资建议' in line:
            current_section = 'recommendations'
            continue
        
        # 去除序号
        cleaned = line
        if len(line) > 0 and line[0].isdigit() and '. ' in line:
            cleaned = line.split('. ', 1)[1]
        elif line.startswith('- '):
            cleaned = line[2:]
        
        if current_section == 'summary':
            result['comparison_result'] += cleaned + '\n'
        elif current_section == 'similarities' and cleaned:
            result['similarities'].append(cleaned)
        elif current_section == 'differences' and cleaned:
            result['differences'].append(cleaned)
        elif current_section == 'recommendations' and cleaned:
            result['recommendations'].append(cleaned)
        elif current_section == 'dimension' and current_dim_data:
            if cleaned.startswith('总结:') or cleaned.startswith('总结：'):
                current_dim_data['summary'] = cleaned.split(':', 1)[-1].split('：', 1)[-1].strip()
            elif cleaned:
                current_dim_data['details'].append(cleaned)
    
    # 保存最后一个维度
    if current_dim_data:
        result['dimension_results'].append(current_dim_data)
    
    result['comparison_result'] = result['comparison_result'].strip()
    return result


# ============ 会话管理 API ============

@agent_ns.route('/sessions')
class SessionList(Resource):
    """会话列表接口"""
    
    @agent_ns.doc('list_sessions')
    @agent_ns.response(200, '查询成功', success_response_model)
    def get(self):
        """
        获取所有会话列表
        
        返回所有会话的摘要信息（不含完整消息）
        """
        sessions = chat_storage.list_sessions()
        return {
            'code': 0,
            'message': 'success',
            'data': {'sessions': sessions},
            'trace_id': generate_trace_id()
        }
    
    @agent_ns.doc('create_session')
    @agent_ns.response(200, '创建成功', success_response_model)
    def post(self):
        """
        创建新会话
        
        可选传入 title 和 report_ids
        """
        data = request.get_json() or {}
        title = data.get('title', '新对话')
        report_ids = data.get('report_ids', [])
        
        session = chat_storage.create_session(title=title, report_ids=report_ids)
        return {
            'code': 0,
            'message': '创建成功',
            'data': {'session': session},
            'trace_id': generate_trace_id()
        }


@agent_ns.route('/sessions/<string:session_id>')
@agent_ns.param('session_id', '会话ID')
class SessionDetail(Resource):
    """单个会话操作接口"""
    
    @agent_ns.doc('get_session')
    @agent_ns.response(200, '查询成功', success_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def get(self, session_id):
        """
        获取会话详情
        
        根据会话ID获取详细信息（包含所有消息）
        """
        session = chat_storage.get_session(session_id)
        if not session:
            return {'code': 1, 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        return {
            'code': 0,
            'message': 'success',
            'data': {'session': session},
            'trace_id': generate_trace_id()
        }
    
    @agent_ns.doc('update_session')
    @agent_ns.response(200, '更新成功', success_response_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def put(self, session_id):
        """
        更新会话（重命名）
        
        修改会话标题
        """
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        
        if not title:
            return {'code': 1, 'message': '标题不能为空', 'data': None, 'trace_id': generate_trace_id()}, 400
        
        result = chat_storage.update_session(session_id, title=title)
        if not result:
            return {'code': 1, 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        return {
            'code': 0,
            'message': '更新成功',
            'data': {'session': result},
            'trace_id': generate_trace_id()
        }
    
    @agent_ns.doc('delete_session')
    @agent_ns.response(200, '删除成功', success_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def delete(self, session_id):
        """
        删除会话
        
        删除指定会话及其所有消息
        """
        success = chat_storage.delete_session(session_id)
        if not success:
            return {'code': 1, 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        
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
        """
        获取会话消息历史
        
        返回指定会话的所有消息列表
        """
        session = chat_storage.get_session(session_id)
        if not session:
            return {'code': 1, 'message': '会话不存在', 'data': None, 'trace_id': generate_trace_id()}, 404
        
        return {
            'code': 0,
            'message': 'success',
            'data': {'messages': session.get('messages', [])},
            'trace_id': generate_trace_id()
        }



def _build_query_prompt(question, reports, history_messages=None):
    """构建问答提示词
    
    Args:
        question: 用户问题
        reports: 参考研报列表
        history_messages: 历史对话消息列表，用于多轮对话上下文
    """
    prompt = "你是一位专业的证券分析师，请基于以下研报内容回答问题。\n"
    
    if history_messages:
        prompt += "请基于对话历史的上下文继续回答。\n"
    
    prompt += "\n【参考研报】\n"
    for i, report in enumerate(reports, 1):
        prompt += f"\n研报{i}: {report.get('title', '未命名')}\n"
        prompt += f"公司: {report.get('company', '-')} ({report.get('company_code', '-')})\n"
        prompt += f"核心观点: {report.get('core_views', '-')}\n"
        if report.get('financial_forecast'):
            prompt += f"财务预测: {str(report['financial_forecast'])}\n"
    
    # 插入最近5轮对话历史
    if history_messages:
        recent = history_messages[-10:]  # 最近5轮 = 10条消息（user+assistant）
        prompt += "\n【对话历史】\n"
        for msg in recent:
            role_label = '用户' if msg.get('role') == 'user' else '助手'
            content = msg.get('content', '')
            # 每条消息最多保留500字
            if len(content) > 500:
                content = content[:500] + '...'
            prompt += f"{role_label}: {content}\n"
    
    prompt += f"\n【用户问题】\n{question}\n\n"
    prompt += "请基于以上研报内容，给出专业、准确的回答。如果研报中没有相关信息，请明确说明。"
    prompt += "请在回答中适当引用研报来源，使用格式 [来源:研报标题]。"
    
    return prompt
