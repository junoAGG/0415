"""
研报管理路由 - REST API
"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from storage.report_storage import ReportStorage
from storage.file_storage import FileStorage
from services.parser import ReportParser

agent_bp = Blueprint('agent', __name__)

# 初始化存储
report_storage = ReportStorage()
file_storage = FileStorage()
parser = ReportParser()


def generate_trace_id():
    """生成追踪ID"""
    return str(uuid.uuid4())[:12]


def success_response(data=None, message=None):
    """成功响应"""
    return jsonify({
        'code': 0,
        'message': message or 'success',
        'data': data,
        'trace_id': generate_trace_id()
    })


def error_response(code, message, http_status=400):
    """错误响应"""
    response = jsonify({
        'code': code,
        'message': message,
        'data': None,
        'trace_id': generate_trace_id()
    })
    response.status_code = http_status
    return response


@agent_bp.route('/reports/upload', methods=['POST'])
def upload_report():
    """上传研报
    
    POST /api/v1/agent/reports/upload
    
    Form Data:
        - files: 文件列表 (PDF/HTML, max 50MB each, max 10 files)
    
    Returns:
        {
            "code": 0,
            "message": "success",
            "data": {
                "uploaded": [...],
                "failed": [...]
            }
        }
    """
    if 'files' not in request.files:
        return error_response('EMPTY_FILE', '请选择要上传的文件', 400)
    
    files = request.files.getlist('files')
    
    if not files or files[0].filename == '':
        return error_response('EMPTY_FILE', '请选择要上传的文件', 400)
    
    if len(files) > 10:
        return error_response('TOO_MANY_FILES', '一次最多上传10个文件', 400)
    
    uploaded = []
    failed = []
    
    for file_obj in files:
        # 保留原始文件名（含中文）用于标题提取和类型检查
        # secure_filename 会过滤中文字符导致文件名为空，上传失败
        raw_name = file_obj.filename or ''
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
        
        # TODO: 异步触发解析
        # 这里先同步解析
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
    
    return success_response({
        'uploaded': uploaded,
        'failed': failed
    }, f'成功上传 {len(uploaded)} 个文件，失败 {len(failed)} 个')


@agent_bp.route('/reports', methods=['GET'])
def list_reports():
    """获取研报列表
    
    GET /api/v1/agent/reports?page=1&page_size=20&search=&sort_by=created_at&filter_status=all
    
    Query Params:
        - page: 页码 (默认1)
        - page_size: 每页数量 (默认20)
        - search: 搜索关键词
        - sort_by: 排序字段 (created_at/date)
        - filter_status: 状态筛选 (all/pending/parsing/completed/failed)
    
    Returns:
        {
            "code": 0,
            "data": {
                "items": [...],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "total_pages": 5
            }
        }
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', None)
    sort_by = request.args.get('sort_by', 'created_at')
    filter_status = request.args.get('filter_status', 'all')
    
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
    
    return success_response(result)


@agent_bp.route('/reports/<report_id>', methods=['GET'])
def get_report(report_id):
    """获取研报详情
    
    GET /api/v1/agent/reports/{report_id}
    
    Returns:
        {
            "code": 0,
            "data": { ...report details... }
        }
    """
    report = report_storage.get(report_id)
    
    if not report:
        return error_response('REPORT_NOT_FOUND', '研报不存在或已删除', 404)
    
    return success_response(report)


@agent_bp.route('/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    """删除研报
    
    DELETE /api/v1/agent/reports/{report_id}
    
    Returns:
        {
            "code": 0,
            "message": "删除成功"
        }
    """
    report = report_storage.get(report_id)
    
    if not report:
        return error_response('REPORT_NOT_FOUND', '研报不存在或已删除', 404)
    
    # 删除文件
    if report.get('filename'):
        file_storage.delete(report['filename'])
    
    # 删除记录
    report_storage.delete(report_id)
    
    return success_response(message='删除成功')


@agent_bp.route('/reports/<report_id>/reparse', methods=['POST'])
def reparse_report(report_id):
    """重新解析研报
    
    POST /api/v1/agent/reports/{report_id}/reparse
    
    Returns:
        {
            "code": 0,
            "data": { ...updated report... }
        }
    """
    report = report_storage.get(report_id)
    
    if not report:
        return error_response('REPORT_NOT_FOUND', '研报不存在或已删除', 404)
    
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
            return success_response(updated, '重新解析成功')
        else:
            updated = report_storage.update(report_id, {
                'status': 'failed',
                'parse_error': parse_result['error']
            })
            return error_response('PARSE_FAILED', parse_result['error'], 422)
    except Exception as e:
        report_storage.update(report_id, {
            'status': 'failed',
            'parse_error': str(e)
        })
        return error_response('PARSE_FAILED', str(e), 422)