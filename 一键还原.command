#!/bin/bash
cd "$(dirname "$0")/.."
echo ""
echo "  ============================================="
echo "    Claudian Tab Title Patch - 还原"
echo "    恢复到插件原始状态 · by 云间AI手册"
echo "  ============================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "  [X] 需要先安装 Node.js"
    echo ""
    read -p "  按回车退出..."
    exit 1
fi

if [ ! -d ".obsidian" ]; then
    echo "  [X] 没有检测到 Obsidian 库"
    echo "      请把文件夹放到 Obsidian 库根目录再运行"
    echo ""
    read -p "  按回车退出..."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/patch-claudian-tabs.js" --undo "."
echo ""
echo "  已还原！重启 Obsidian 即可生效"
echo ""
read -p "  按回车退出..."
