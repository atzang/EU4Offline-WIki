#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量将所有 HTML 中的 MediaTransformError（创建缩略图出错：文件丢失）
替换为旗帜占位符 img 标签。

占位符：../images/flag_placeholder.svg（wiki/ 页面）或 ./images/flag_placeholder.svg（index.html）
"""

import os
import re
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 匹配 MediaTransformError div，捕获其中的宽高
# 例：<div class="MediaTransformError" style="width: 20px; height: 13px; display:inline-block;">创建缩略图出错：文件丢失</div>
PATTERN = re.compile(
    r'<div\s+class="MediaTransformError"\s+style="width:\s*(\d+)px;\s*height:\s*(\d+)px;[^"]*">'
    r'创建缩略图出错：文件丢失'
    r'</div>',
    re.IGNORECASE
)

def make_placeholder(w, h, img_prefix):
    """生成占位符 img 标签"""
    return (
        f'<img alt="旗帜图标" src="{img_prefix}images/flag_placeholder.svg" '
        f'width="{w}" height="{h}" '
        f'style="border:1px solid #ccc;background:#d8dde6;display:inline-block;" '
        f'title="旗帜图片缺失"/>'
    )

def process_file(filepath, img_prefix):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        return False, f"读取失败: {e}"

    if '创建缩略图出错' not in content:
        return False, None  # 无需处理

    def replacer(m):
        w, h = m.group(1), m.group(2)
        return make_placeholder(w, h, img_prefix)

    new_content = PATTERN.sub(replacer, content)

    if new_content != content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True, None
        except Exception as e:
            return False, f"写入失败: {e}"
    return False, None


def main():
    total = 0
    modified = 0
    errors = []

    # 处理 index.html（相对路径前缀：./）
    index_path = os.path.join(BASE_DIR, 'index.html')
    if os.path.exists(index_path):
        total += 1
        ok, err = process_file(index_path, './')
        if ok:
            modified += 1
            print(f"  [OK] index.html")
        elif err:
            errors.append(f"index.html: {err}")

    # 处理 wiki/*.html（相对路径前缀：../）
    wiki_dir = os.path.join(BASE_DIR, 'wiki')
    html_files = glob.glob(os.path.join(wiki_dir, '*.html'))
    print(f"\n开始处理 wiki/ 下 {len(html_files)} 个文件...")

    for i, filepath in enumerate(html_files):
        total += 1
        ok, err = process_file(filepath, '../')
        if ok:
            modified += 1
        elif err:
            errors.append(f"{os.path.basename(filepath)}: {err}")
        if (i + 1) % 1000 == 0:
            print(f"  已处理 {i+1}/{len(html_files)}，已修改 {modified} 个...")

    print(f"\n完成！共扫描 {total} 个文件，修改了 {modified} 个文件。")
    if errors:
        print(f"\n错误 ({len(errors)}):")
        for e in errors[:10]:
            print(f"  {e}")

if __name__ == '__main__':
    main()
