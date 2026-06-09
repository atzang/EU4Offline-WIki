#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
侧边栏修正：
1. 从列表中删除"返回首页"的 li 条目（之前错误地加在列表里）
2. 在底部 live-recent-footer 的按钮区域，"查看可成立国家"后面追加"返回首页"按钮
"""

import os
import re
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── 要删除的 li 条目（两种形式，分别对应 wiki/ 和 index.html）──────────────

# wiki/ 页面：../index.html
REMOVE_LI_WIKI_OLD = '\t\t\t\t<li style="padding:4px 8px;"><span class="recent-item"><a href="../index.html" title="首页">返回首页</a></span></li>'
# index.html：./index.html（来自 add_back_to_top_and_fix_sidebar.py 注入的带 border-top 版本）
REMOVE_LI_INDEX_OLD = '\t\t\t\t<li style="padding:5px 8px;border-top:1px solid #ddd;margin-top:4px;"><span class="recent-item"><a href="./index.html" title="返回首页" style="font-weight:bold;color:#103D8F;">&#8962; 返回首页</a></span></li>'

# ─── 底部 footer 的旧内容 → 新内容 ────────────────────────────────────────

# wiki/ 页面 footer（../wiki/可成立国家.html 或 ../可成立国家.html）
FOOTER_OLD_WIKI = '\t\t<div class="live-recent-footer">\n\t\t\t<a href="../wiki/可成立国家.html" title="可成立国家"><span class="label label-info">查看可成立国家</span></a>\n\t\t</div>'
FOOTER_NEW_WIKI = (
    '\t\t<div class="live-recent-footer" style="display:flex;flex-direction:column;gap:6px;padding:6px 8px;">\n'
    '\t\t\t<a href="../wiki/可成立国家.html" title="可成立国家" style="display:block;"><span class="label label-info" style="display:block;text-align:center;">查看可成立国家</span></a>\n'
    '\t\t\t<a href="../index.html" title="返回首页" style="display:block;"><span class="label label-info" style="display:block;text-align:center;font-weight:bold;">&#8962; 返回首页</span></a>\n'
    '\t\t</div>'
)

# index.html footer
FOOTER_OLD_INDEX = '\t\t<div class="live-recent-footer">\n\t\t\t<a href="./wiki/可成立国家.html" title="可成立国家"><span class="label label-info">查看可成立国家</span></a>\n\t\t</div>'
FOOTER_NEW_INDEX = (
    '\t\t<div class="live-recent-footer" style="display:flex;flex-direction:column;gap:6px;padding:6px 8px;">\n'
    '\t\t\t<a href="./wiki/可成立国家.html" title="可成立国家" style="display:block;"><span class="label label-info" style="display:block;text-align:center;">查看可成立国家</span></a>\n'
    '\t\t\t<a href="./index.html" title="返回首页" style="display:block;"><span class="label label-info" style="display:block;text-align:center;font-weight:bold;">&#8962; 返回首页</span></a>\n'
    '\t\t</div>'
)


def process_file(filepath: str, is_index: bool = False):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        return False, f"读取失败: {e}"

    original = content

    if is_index:
        # 1. 删除列表中的"返回首页" li
        content = content.replace(REMOVE_LI_INDEX_OLD + '\n', '')
        content = content.replace(REMOVE_LI_INDEX_OLD, '')
        # 2. 替换 footer
        content = content.replace(FOOTER_OLD_INDEX, FOOTER_NEW_INDEX)
    else:
        # 1. 删除列表中的"返回首页" li（wiki/ 版本）
        content = content.replace(REMOVE_LI_WIKI_OLD + '\n', '')
        content = content.replace(REMOVE_LI_WIKI_OLD, '')
        # 2. 替换 footer
        content = content.replace(FOOTER_OLD_WIKI, FOOTER_NEW_WIKI)

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

    # 处理 index.html
    index_path = os.path.join(BASE_DIR, 'index.html')
    if os.path.exists(index_path):
        total += 1
        ok, err = process_file(index_path, is_index=True)
        if ok:
            modified += 1
            print(f"  [OK] index.html")
        elif err:
            errors.append(f"index.html: {err}")

    # 批量处理 wiki/*.html
    wiki_dir = os.path.join(BASE_DIR, 'wiki')
    html_files = glob.glob(os.path.join(wiki_dir, '*.html'))
    print(f"\n开始处理 wiki/ 下 {len(html_files)} 个文件...")

    for i, filepath in enumerate(html_files):
        total += 1
        ok, err = process_file(filepath, is_index=False)
        if ok:
            modified += 1
        elif err:
            errors.append(f"{os.path.basename(filepath)}: {err}")
        if (i + 1) % 2000 == 0:
            print(f"  已处理 {i+1}/{len(html_files)}，已修改 {modified} 个...")

    print(f"\n完成！共扫描 {total} 个文件，修改了 {modified} 个文件。")
    if errors:
        print(f"\n错误 ({len(errors)}):")
        for e in errors[:10]:
            print(f"  {e}")


if __name__ == '__main__':
    main()
