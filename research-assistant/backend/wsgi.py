"""
投研助手 - Flask应用入口
"""
import os
from dotenv import load_dotenv
from flask import Flask, Blueprint
from flask_cors import CORS
from flask_restx import Api

# 加载环境变量
load_dotenv()

def create_app():
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 配置
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'data', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
    app.config['RESTX_MASK_SWAGGER'] = False
    
    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 启用CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # 创建API实例 (Swagger文档)
    api = Api(
        app,
        version='1.0',
        title='投研助手 API',
        description='研报管理系统的RESTful API文档',
        doc='/swagger',  # Swagger UI路径
        prefix='/api/v1'
    )
    
    # 注册命名空间
    from routes.agent_ns import agent_ns
    api.add_namespace(agent_ns, path='/agent')
    
    from routes.stock_ns import stock_ns
    api.add_namespace(stock_ns, path='/stock')
    
    # 健康检查
    @app.route('/health')
    def health_check():
        return {'status': 'ok', 'service': 'research-assistant'}
    
    return app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
