from locust import HttpUser, task, between
import random

class IraVinUser(HttpUser):
    """
    ira.vin网站压力测试用户类
    模拟真实用户访问网站的行为模式
    """
    
    # 用户思考时间：每次请求间隔1-5秒
    wait_time = between(1, 5)
    
    # 目标主机
    host = "http://ira.vin"
    
    def on_start(self):
        """用户启动时执行，模拟用户首次访问"""
        print(f"🚀 新用户开始访问 {self.host}")
    
    @task(10)
    def visit_homepage(self):
        """访问首页 - 最高权重"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"首页访问失败: {response.status_code}")
    
    @task(5)
    def visit_about(self):
        """访问关于页面"""
        with self.client.get("/about", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # 如果页面不存在，标记为成功但记录信息
                response.success()
            else:
                response.failure(f"关于页面访问失败: {response.status_code}")
    
    @task(3)
    def visit_contact(self):
        """访问联系页面"""
        with self.client.get("/contact", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                response.success()
            else:
                response.failure(f"联系页面访问失败: {response.status_code}")
    
    @task(2)
    def simulate_browsing(self):
        """模拟浏览行为：访问首页后随机停留"""
        # 先访问首页
        self.client.get("/")
        
        # 模拟用户阅读时间（2-8秒）
        import time
        time.sleep(random.uniform(2, 8))
        
        # 随机访问其他页面
        pages = ["/", "/about", "/services", "/portfolio", "/blog"]
        random_page = random.choice(pages)
        
        with self.client.get(random_page, catch_response=True) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"浏览页面失败: {response.status_code}")
    
    @task(1)
    def rapid_requests(self):
        """快速连续请求测试 - 模拟高并发场景"""
        for _ in range(3):
            with self.client.get("/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"快速请求失败: {response.status_code}")
    
    def on_stop(self):
        """用户停止时执行"""
        print(f"👋 用户停止访问 {self.host}")


class HeavyLoadUser(HttpUser):
    """
    重负载测试用户类
    用于模拟极端压力场景
    """
    
    wait_time = between(0.1, 0.5)  # 极短间隔，高频率请求
    host = "http://ira.vin"
    
    @task
    def heavy_load_homepage(self):
        """高频率访问首页"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"重负载测试失败: {response.status_code}")
