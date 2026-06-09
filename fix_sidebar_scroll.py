#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
侧边栏修正：
1. 删除 footer 中的「查看可成立国家」按钮，只保留「返回首页」
2. 给 live-recent-wrapper 注入 CSS，让常用页面区域随页面滚动而非固定定位
"""

import os
import re
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── footer 替换：删除查看可成立国家，只留返回首页 ────────────────────────────

# wiki/ 页面：双按钮 → 单按钮（返回首页）
FOOTER_OLD_WIKI = (
    '\t\t<div class="live-recent-footer" style="display:flex;flex-direction:column;gap:6px;padding:6px 8px;">\n'
    '\t\t\t<a href="../wiki/可成立国家.html" title="可成立国家" style="display:block;"><span class="label label-info" style="display:block;text-align:center;">查看可成立国家</span></a>\n'
    '\t\t\t<a href="../index.html" title="返回首页" style="display:block;"><span class="label label-info" style="display:block;text-align:center;font-weight:bold;">&#8962; 返回首页</span></a>\n'
    '\t\t</div>'
)
FOOTER_NEW_WIKI = (
    '\t\t<div class="live-recent-footer">\n'
    '\t\t\t<a href="../index.html" title="返回首页"><span class="label label-info" style="font-weight:bold;">&#8962; 返回首页</span></a>\n'
    '\t\t</div>'
)

# index.html：双按钮 → 单按钮
FOOTER_OLD_INDEX = (
    '\t\t<div class="live-recent-footer" style="display:flex;flex-direction:column;gap:6px;padding:6px 8px;">\n'
    '\t\t\t<a href="./wiki/可成立国家.html" title="可成立国家" style="display:block;"><span class="label label-info" style="display:block;text-align:center;">查看可成立国家</span></a>\n'
    '\t\t\t<a href="./index.html" title="返回首页" style="display:block;"><span class="label label-info" style="display:block;text-align:center;font-weight:bold;">&#8962; 返回首页</span></a>\n'
    '\t\t</div>'
)
FOOTER_NEW_INDEX = (
    '\t\t<div class="live-recent-footer">\n'
    '\t\t\t<a href="./index.html" title="返回首页"><span class="label label-info" style="font-weight:bold;">&#8962; 返回首页</span></a>\n'
    '\t\t</div>'
)

# ─── 让 live-recent-wrapper 随滚动条滚动的内联样式注入 ────────────────────────

STICKY_CSS = """<style>
/* 常用页面随页面滚动 */
.live-recent-wrapper {
    position: static !important;
}
.liberty-sidebar .live-recent-wrapper .live-recent {
    position: static !important;
}
</style>"""

# 标记：避免重复注入
SCROLL_INJECT_MARK = '/* 常用页面随页面滚动 */'


def process_file(filepath: str, is_index: bool = False):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        return False, f"读取失败: {e}"

    original = content

    # 1. 删除「查看可成立国家」按钮
    if is_index:
        content = content.replace(FOOTER_OLD_INDEX, FOOTER_NEW_INDEX)
    else:
        content = content.replace(FOOTER_OLD_WIKI, FOOTER_NEW_WIKI)

    # 2. 如果还没注入过滚动样式，则在 </body> 前注入
    if SCROLL_INJECT_MARK not in content:
        content = content.replace('</body>', STICKY_CSS + '</body>', 1)

    if content != original:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, None
        except Exception as e:
            return False, f"写入失败: {e}"
    return False, None


def main():
    total = 0
    modified = 0
    errors = []

    # index.html
    index_path = os.path.join(BASE_DIR, 'index.html')
    if os.path.exists(index_path):
        total += 1
        ok, err = process_file(index_path, is_index=True)
        if ok:
            modified += 1
            print(f"  [OK] index.html")
        elif err:
            errors.append(f"index.html: {err}")

    # wiki/*.html
    wiki_dir = os.path.join(BASE_DIR, 'wiki')
    html_files = glob.glob(os.path.join(wiki_dir, '*.html'))
    print(f"\n处理 {len(html_files)} 个 wiki 文件...")

    for i, filepath in enumerate(html_files):
        total += 1
        ok, err = process_file(filepath, is_index=False)
        if ok:
            modified += 1
        elif err:
            errors.append(f"{os.path.basename(filepath)}: {err}")
        if (i + 1) % 2000 == 0:
            print(f"  已处理 {i+1}/{len(html_files)}，已改 {modified}...")

    print(f"\n完成！共扫描 {total} 个文件，修改了 {modified} 个。")
    if errors:
        for e in errors[:10]:
            print(f"  错误: {e}")


if __name__ == '__main__':
    main()
