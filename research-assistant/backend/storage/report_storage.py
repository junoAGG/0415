"""
研报存储
"""
import os
from typing import Dict, List, Optional
from .base import JSONStorage


class ReportStorage(JSONStorage):
    """研报数据存储"""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        super().__init__(data_dir, 'reports.json')
    
    def create(self, report_data: Dict) -> Dict:
        """创建研报记录"""
        reports = self._read_all()
        
        report = {
            'id': self._generate_id(),
            'title': report_data.get('title', ''),
            'company': report_data.get('company', ''),
            'company_code': report_data.get('company_code', ''),
            'broker': report_data.get('broker', ''),
            'analyst': report_data.get('analyst', ''),
            'rating': report_data.get('rating', ''),
            'target_price': report_data.get('target_price'),
            'current_price': report_data.get('current_price'),
            'core_views': report_data.get('core_views', ''),
            # 财务预测数据
            'financial_forecast': report_data.get('financial_forecast', {}),
            # 投资评级建议
            'investment_rating': report_data.get('investment_rating', {}),
            # 盈利能力指标
            'profitability': report_data.get('profitability', {}),
            # 成长性指标
            'growth': report_data.get('growth', {}),
            # 估值指标
            'valuation': report_data.get('valuation', {}),
            # 偿债能力指标
            'solvency': report_data.get('solvency', {}),
            # 现金流指标
            'cashflow': report_data.get('cashflow', {}),
            'content': report_data.get('content', ''),  # 研报原文内容
            'file_path': report_data.get('file_path', ''),
            'filename': report_data.get('filename', ''),
            'file_type': report_data.get('file_type', ''),
            'file_size': report_data.get('file_size', 0),
            'status': report_data.get('status', 'pending'),  # pending, parsing, completed, failed
            'parse_error': report_data.get('parse_error', ''),
            'created_at': self._now(),
            'updated_at': self._now(),
        }
        
        reports.append(report)
        self._write_all(reports)
        return report
    
    def get(self, report_id: str) -> Optional[Dict]:
        """获取单个研报"""
        reports = self._read_all()
        for report in reports:
            if report['id'] == report_id:
                return report
        return None
    
    def list(self, 
             page: int = 1, 
             page_size: int = 20,
             search: str = None,
             sort_by: str = 'created_at',
             filter_status: str = None) -> Dict:
        """获取研报列表"""
        reports = self._read_all()
        
        # 筛选
        if filter_status and filter_status != 'all':
            reports = [r for r in reports if r['status'] == filter_status]
        
        # 搜索
        if search:
            search_lower = search.lower()
            reports = [
                r for r in reports 
                if (search_lower in r.get('title', '').lower() or
                    search_lower in r.get('company', '').lower() or
                    search_lower in r.get('company_code', '').lower() or
                    search_lower in r.get('broker', '').lower())
            ]
        
        # 排序
        reverse = sort_by in ['created_at', 'updated_at', 'date']
        reports.sort(key=lambda x: x.get(sort_by, '') or '', reverse=reverse)
        
        # 分页
        total = len(reports)
        start = (page - 1) * page_size
        end = start + page_size
        items = reports[start:end]
        
        return {
            'items': items,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size
        }
    
    def update(self, report_id: str, update_data: Dict) -> Optional[Dict]:
        """更新研报"""
        reports = self._read_all()
        
        for i, report in enumerate(reports):
            if report['id'] == report_id:
                # 不允许更新id和created_at
                update_data.pop('id', None)
                update_data.pop('created_at', None)
                
                reports[i].update(update_data)
                reports[i]['updated_at'] = self._now()
                self._write_all(reports)
                return reports[i]
        
        return None
    
    def delete(self, report_id: str) -> bool:
        """删除研报"""
        reports = self._read_all()
        
        for i, report in enumerate(reports):
            if report['id'] == report_id:
                reports.pop(i)
                self._write_all(reports)
                return True
        
        return False
    
    def get_by_company(self, company_code: str) -> List[Dict]:
        """获取某公司的所有研报"""
        reports = self._read_all()
        return [r for r in reports if r.get('company_code') == company_code]
