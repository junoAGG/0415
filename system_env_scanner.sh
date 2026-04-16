#!/bin/bash

# 系统环境和软件版本扫描脚本
# System Environment and Software Version Scanner

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 分隔线
print_separator() {
    echo -e "${CYAN}============================================================${NC}"
}

# 打印标题
print_title() {
    echo -e "${GREEN}$1${NC}"
}

# 打印信息
print_info() {
    echo -e "${BLUE}$1${NC}: $2"
}

# 检查命令是否存在
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}[已安装]${NC}"
    else
        echo -e "${RED}[未安装]${NC}"
    fi
}

# 获取版本号
get_version() {
    if command -v "$1" &> /dev/null; then
        case "$1" in
            python|python3)
                python3 --version 2>&1 | awk '{print $2}'
                ;;
            python2)
                python2 --version 2>&1 | awk '{print $2}'
                ;;
            java)
                java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}'
                ;;
            node)
                node --version 2>&1
                ;;
            npm)
                npm --version 2>&1
                ;;
            yarn)
                yarn --version 2>&1
                ;;
            pnpm)
                pnpm --version 2>&1
                ;;
            go)
                go version 2>&1 | awk '{print $3}' | sed 's/go//'
                ;;
            rust|rustc)
                rustc --version 2>&1 | awk '{print $2}'
                ;;
            cargo)
                cargo --version 2>&1 | awk '{print $2}'
                ;;
            ruby)
                ruby --version 2>&1 | awk '{print $2}'
                ;;
            php)
                php --version 2>&1 | head -n 1 | awk '{print $2}'
                ;;
            perl)
                perl --version 2>&1 | grep -oE 'version [0-9.]+' | head -1 | awk '{print $2}'
                ;;
            git)
                git --version 2>&1 | awk '{print $3}'
                ;;
            docker)
                docker --version 2>&1 | awk -F '[ ,]+' '{print $3}'
                ;;
            docker-compose)
                docker-compose --version 2>&1 | awk '{print $3}' | tr -d ','
                ;;
            kubectl)
                kubectl version --client --short 2>&1 | awk '{print $3}' || kubectl version --client 2>&1 | grep -oE 'Client Version: v[0-9.]+' | awk '{print $3}'
                ;;
            helm)
                helm version --short 2>&1
                ;;
            terraform)
                terraform version 2>&1 | head -n 1 | awk '{print $2}' | tr -d 'v'
                ;;
            ansible)
                ansible --version 2>&1 | head -n 1 | awk '{print $2}'
                ;;
            vim)
                vim --version 2>&1 | head -n 1 | grep -oE '[0-9]+\.[0-9]+'
                ;;
            nvim)
                nvim --version 2>&1 | head -n 1 | awk '{print $2}'
                ;;
            tmux)
                tmux -V 2>&1 | awk '{print $2}'
                ;;
            zsh)
                zsh --version 2>&1 | awk '{print $2}'
                ;;
            bash)
                bash --version 2>&1 | head -n 1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'
                ;;
            make)
                make --version 2>&1 | head -n 1 | awk '{print $3}'
                ;;
            cmake)
                cmake --version 2>&1 | head -n 1 | awk '{print $3}'
                ;;
            gcc)
                gcc --version 2>&1 | head -n 1 | awk '{print $3}'
                ;;
            clang)
                clang --version 2>&1 | head -n 1 | awk '{print $4}' | tr -d '('
                ;;
            wget)
                wget --version 2>&1 | head -n 1 | awk '{print $3}'
                ;;
            curl)
                curl --version 2>&1 | head -n 1 | awk '{print $2}'
                ;;
            ssh)
                ssh -V 2>&1 | awk '{print $1}' | cut -d'_' -f2
                ;;
            openssl)
                openssl version 2>&1 | awk '{print $2}'
                ;;
            sqlite3)
                sqlite3 --version 2>&1 | awk '{print $1}'
                ;;
            redis-cli)
                redis-cli --version 2>&1 | awk '{print $2}' | tr -d 'v'
                ;;
            psql)
                psql --version 2>&1 | awk '{print $3}'
                ;;
            mysql)
                mysql --version 2>&1 | awk '{print $5}' | tr -d ','
                ;;
            *)
                "$1" --version 2>&1 | head -n 1
                ;;
        esac
    else
        echo "N/A"
    fi
}

# 检查并打印工具版本
check_tool() {
    local cmd=$1
    local name=$2
    local width=${3:-15}
    printf "%-${width}s %-12s " "$name" "$(check_command $cmd)"
    if command -v "$cmd" &> /dev/null; then
        echo "版本: $(get_version $cmd)"
    else
        echo ""
    fi
}

# 主程序开始
echo ""
print_separator
echo -e "${YELLOW}       系统环境和软件版本扫描报告${NC}"
echo -e "${YELLOW}       System Environment Scanner${NC}"
print_separator
echo -e "扫描时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. 操作系统信息
print_separator
print_title "1. 操作系统信息"
print_separator
print_info "系统类型" "$(uname -s)"
print_info "主机名" "$(uname -n)"
print_info "内核版本" "$(uname -r)"
print_info "系统架构" "$(uname -m)"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_info "发行版名称" "$NAME"
    print_info "发行版版本" "$VERSION"
fi

if [ "$(uname -s)" = "Darwin" ]; then
    print_info "macOS 版本" "$(sw_vers -productVersion)"
    print_info "macOS 构建" "$(sw_vers -buildVersion)"
fi
echo ""

# 2. CPU 信息
print_separator
print_title "2. CPU 信息"
print_separator
if [ "$(uname -s)" = "Darwin" ]; then
    print_info "CPU 型号" "$(sysctl -n machdep.cpu.brand_string)"
    print_info "CPU 核心数" "$(sysctl -n hw.ncpu)"
    print_info "CPU 物理核心" "$(sysctl -n hw.physicalcpu)"
    print_info "CPU 逻辑核心" "$(sysctl -n hw.logicalcpu)"
elif [ -f /proc/cpuinfo ]; then
    print_info "CPU 型号" "$(grep 'model name' /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)"
    print_info "CPU 核心数" "$(nproc)"
    print_info "CPU 物理核心" "$(grep 'cpu cores' /proc/cpuinfo | head -1 | awk '{print $4}')"
fi
echo ""

# 3. 内存信息
print_separator
print_title "3. 内存信息"
print_separator
if [ "$(uname -s)" = "Darwin" ]; then
    total_mem=$(sysctl -n hw.memsize)
    total_mem_gb=$((total_mem / 1024 / 1024 / 1024))
    print_info "总内存" "${total_mem_gb} GB"
    
    # 获取内存使用情况
    mem_info=$(vm_stat)
    free_pages=$(echo "$mem_info" | grep "free" | awk '{print $3}' | tr -d '.')
    page_size=4096
    
    if [ -n "$free_pages" ]; then
        free_mem=$((free_pages * page_size / 1024 / 1024))
        print_info "可用内存" "${free_mem} MB"
    fi
elif [ -f /proc/meminfo ]; then
    total_mem=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    total_mem_gb=$((total_mem / 1024 / 1024))
    free_mem=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    free_mem_mb=$((free_mem / 1024))
    print_info "总内存" "${total_mem_gb} GB"
    print_info "可用内存" "${free_mem_mb} MB"
fi
echo ""

# 4. 磁盘信息
print_separator
print_title "4. 磁盘信息"
print_separator
df -h 2>/dev/null | awk 'NR==1 || /^\/dev\// {print}'
echo ""

# 5. Shell 环境
print_separator
print_title "5. Shell 环境"
print_separator
print_info "当前 Shell" "$SHELL"
print_info "默认编辑器" "${EDITOR:-未设置}"
print_info "HOME 目录" "$HOME"
print_info "PATH 路径数" "$(echo $PATH | tr ':' '\n' | wc -l | xargs)"
echo ""

# 6. 开发工具
print_separator
print_title "6. 开发工具版本"
print_separator
check_tool "git" "Git"
check_tool "curl" "cURL"
check_tool "wget" "Wget"
check_tool "make" "Make"
check_tool "cmake" "CMake"
check_tool "gcc" "GCC"
check_tool "clang" "Clang"
echo ""

# 7. 编程语言
print_separator
print_title "7. 编程语言版本"
print_separator
check_tool "python3" "Python 3" 15
check_tool "python2" "Python 2" 15
check_tool "node" "Node.js" 15
check_tool "npm" "NPM" 15
check_tool "yarn" "Yarn" 15
check_tool "pnpm" "PNPM" 15
check_tool "go" "Go" 15
check_tool "rustc" "Rust" 15
check_tool "cargo" "Cargo" 15
check_tool "ruby" "Ruby" 15
check_tool "php" "PHP" 15
check_tool "perl" "Perl" 15
check_tool "java" "Java" 15
echo ""

# 8. 容器和云工具
print_separator
print_title "8. 容器和云工具版本"
print_separator
check_tool "docker" "Docker" 20
check_tool "docker-compose" "Docker Compose" 20
check_tool "kubectl" "Kubectl" 20
check_tool "helm" "Helm" 20
check_tool "terraform" "Terraform" 20
check_tool "ansible" "Ansible" 20
echo ""

# 9. 数据库客户端
print_separator
print_title "9. 数据库客户端版本"
print_separator
check_tool "psql" "PostgreSQL Client" 20
check_tool "mysql" "MySQL Client" 20
check_tool "redis-cli" "Redis Client" 20
check_tool "sqlite3" "SQLite" 20
echo ""

# 10. 实用工具
print_separator
print_title "10. 实用工具版本"
print_separator
check_tool "vim" "Vim"
check_tool "nvim" "Neovim"
check_tool "tmux" "Tmux"
check_tool "zsh" "Zsh"
check_tool "bash" "Bash"
check_tool "ssh" "OpenSSH"
check_tool "openssl" "OpenSSL"
echo ""

# 11. 网络信息
print_separator
print_title "11. 网络信息"
print_separator
print_info "主机名" "$(hostname)"
print_info "本地 IP" "$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "N/A")"
if [ -f /etc/resolv.conf ]; then
    print_info "DNS 服务器" "$(grep nameserver /etc/resolv.conf 2>/dev/null | awk '{print $2}' | head -3 | tr '\n' ' ' || echo "N/A")"
elif [ "$(uname -s)" = "Darwin" ]; then
    print_info "DNS 服务器" "$(scutil --dns | grep 'nameserver\[0\]' | awk '{print $3}' | head -3 | tr '\n' ' ' || echo "N/A")"
fi
echo ""

# 扫描完成
print_separator
echo -e "${GREEN}扫描完成！${NC}"
print_separator
echo ""
