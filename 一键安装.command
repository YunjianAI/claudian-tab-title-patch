#!/bin/bash
cd "$(dirname "$0")/.."
echo ""
echo "  ============================================="
echo "    Claudian Tab Title Patch"
echo "    让标签显示对话标题 · by 云间AI手册"
echo "  ============================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "  [X] 需要先安装 Node.js"
    echo "      下载地址: https://nodejs.org"
    echo ""
    read -p "  按回车退出..."
    exit 1
fi

if [ ! -d ".obsidian" ]; then
    echo "  [X] 没有检测到 Obsidian 库"
    echo "      请把整个文件夹复制到你的 Obsidian 库根目录，再双击运行"
    echo ""
    read -p "  按回车退出..."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/patch-claudian-tabs.js" "."
echo ""
echo "  完成！重启 Obsidian 即可生效"
echo ""
read -p "  按回车退出..."
