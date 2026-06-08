#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复 eu4cn.com 爬取站点的离线链接
- 将 https://www.eu4cn.com/wiki/XXX 转为 ./XXX.html 或 ../wiki/XXX.html（按所在目录）
- 修复 CSS/JS 相对路径
- 去除 GA、AdSense 脚本块
- 去除 PHP Notice 错误信息
"""

import os
import re
import sys

BASE = r"D:\Downloads\www.eu4cn.com"
WIKI_DIR = os.path.join(BASE, "wiki")
INDEX_FILE = os.path.join(BASE, "index.html")

SITE = "https://www.eu4cn.com"

# ── 工具函数 ──────────────────────────────────────────────────

def fix_html(content, depth):
    """
    depth=0 → 文件在根目录 (index.html)
    depth=1 → 文件在 wiki/ 目录
    """

    # 1. 去除 PHP Notice 错误
    content = re.sub(
        r'<br\s*/?>\s*<b>Notice</b>:.*?on line\s*<b>\d+</b><br\s*/?>',
        '',
        content,
        flags=re.DOTALL
    )

    # 2. 去除 Google Analytics 脚本块 (gtag / UA- / G-)
    content = re.sub(
        r'<!--\s*Global site tag[^>]*-->.*?</script>',
        '',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'<script[^>]*>\s*window\.dataLayer.*?gtag\(\'config\'.*?</script>',
        '',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'<script\s+async[^>]+gtag/js[^>]*></script>',
        '',
        content
    )

    # 3. 去除 AdSense ins 块
    content = re.sub(
        r'<ins class="adsbygoogle".*?</ins>\s*<script[^>]*>\s*\(adsbygoogle[^<]*</script>',
        '',
        content,
        flags=re.DOTALL
    )

    # 4. 修复 CSS/JS 路径（根目录需要正确路径）
    if depth == 0:
        # index.html 在根目录，<link href="../liberty.css"> 改为 ./liberty.css
        content = content.replace('href="../liberty.css"', 'href="./liberty.css"')
        content = content.replace('href="../all.css"', 'href="./all.css"')
        content = content.replace('href="../v4-shims.css"', 'href="./v4-shims.css"')
        content = content.replace('href="../skinliberty.css"', 'href="./skinliberty.css"')
        content = content.replace('src="./liberty.js"', 'src="./liberty.js"')
        content = content.replace('src="../liberty.js"', 'src="./liberty.js"')
        # skin=liberty.js
        content = content.replace('src="./skin=liberty.js"', 'src="./skin=liberty.js"')
        content = content.replace('src="../skin=liberty.js"', 'src="./skin=liberty.js"')
    else:
        # wiki/ 目录，路径已是 ../liberty.css，保持不变（正确）
        pass

    # 5. 修复图片 srcset 里的损坏属性（, /images/... 2x）
    # 原始: src="..." decoding="async" width="x" height="x"  , /images/... 2x"
    # 修复: 去掉损坏的 srcset 片段
    content = re.sub(
        r'\s{2,},\s*/images/[^"]*\s*\dx"',
        '"',
        content
    )

    # 6. 将绝对 URL 链接转为相对路径
    # 6a. href="https://www.eu4cn.com/wiki/页面名" → wiki 页面
    def replace_wiki_href(m):
        page = m.group(1)
        # URL 解码不做，保留原始编码
        if depth == 0:
            return f'href="./wiki/{page}.html"'
        else:
            return f'href="./{page}.html"'

    content = re.sub(
        r'href="https?://www\.eu4cn\.com/wiki/([^"#?]+)"',
        replace_wiki_href,
        content
    )

    # 6b. href="https://www.eu4cn.com/index.php?title=XXX&action=..." 
    #    → 不可离线，替换为 #（保留 title 可读）
    content = re.sub(
        r'href="https?://www\.eu4cn\.com/index\.php\?[^"]*"',
        'href="#"',
        content
    )

    # 6c. href="https://www.eu4cn.com/" → 主页
    if depth == 0:
        content = re.sub(
            r'href="https?://www\.eu4cn\.com/?"(?=[ >])',
            'href="./index.html"',
            content
        )
    else:
        content = re.sub(
            r'href="https?://www\.eu4cn\.com/?"(?=[ >])',
            'href="../index.html"',
            content
        )

    # 7. 修复 action="https://www.eu4cn.com/index.php" → "#"
    content = content.replace(
        'action="https://www.eu4cn.com/index.php"',
        'action="#"'
    )

    # 8. 修复 navbar-brand href（指向错误的图片 html）
    #    href="./images/4/4d/萬方logo1.png%3F20220611124730.html"
    if depth == 0:
        content = content.replace(
            'href="./images/4/4d/萬方logo1.png%3F20220611124730.html"',
            'href="./index.html"'
        )
        content = content.replace(
            'href="./images/4/4d/%E8%90%AC%E6%96%B9logo1.png%3F20220611124730.html"',
            'href="./index.html"'
        )
    else:
        content = content.replace(
            'href="./images/4/4d/萬方logo1.png%3F20220611124730.html"',
            'href="../index.html"'
        )
        content = content.replace(
            'href="../images/4/4d/萬方logo1.png%3F20220611124730.html"',
            'href="../index.html"'
        )
        content = content.replace(
            'href="../images/4/4d/%E8%90%AC%E6%96%B9logo1.png%3F20220611124730.html"',
            'href="../index.html"'
        )

    # 9. wiki/ 页面中修复图片路径 src="./images/..." → src="../images/..."
    if depth == 1:
        # 先把已经是 ../images 的不动，只改 ./images
        content = re.sub(r'src="\./images/', 'src="../images/', content)
        # 也修复没有 ./ 前缀但以 images/ 开头的
        # content = re.sub(r'src="images/', 'src="../images/', content)

    # 10. 修复 wiki/ 页面中 href="./wiki/XXX" → href="./XXX"（去掉多余的 wiki/）
    if depth == 1:
        content = re.sub(r'href="\./wiki/', 'href="./', content)
        # 也修复 href="../wiki/XXX" 的情况（有些页面可能有）
        # 对于 wiki/ 目录页面来说 ../wiki/ 相对路径是正确的，保留

    return content


def process_file(filepath, depth):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        print(f"  [ERROR] 读取失败: {filepath}: {e}")
        return False

    new_content = fix_html(content, depth)

    if new_content != content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        except Exception as e:
            print(f"  [ERROR] 写入失败: {filepath}: {e}")
            return False
    return False


# ── 主流程 ────────────────────────────────────────────────────

def main():
    print("=== 开始修复离线链接 ===\n")

    # 处理 index.html
    print("[1/2] 处理根目录 index.html ...")
    changed = process_file(INDEX_FILE, depth=0)
    print(f"  → {'已修改' if changed else '无变化'}")

    # 处理 wiki/ 下所有 .html
    print("\n[2/2] 处理 wiki/ 目录下所有 HTML 文件 ...")
    total = 0
    modified = 0
    errors = 0

    html_files = [
        f for f in os.listdir(WIKI_DIR)
        if f.lower().endswith('.html')
    ]
    print(f"  共发现 {len(html_files)} 个 HTML 文件")

    for fname in html_files:
        fpath = os.path.join(WIKI_DIR, fname)
        total += 1
        result = process_file(fpath, depth=1)
        if result:
            modified += 1
        if total % 1000 == 0:
            print(f"  已处理 {total}/{len(html_files)} ...")

    print(f"\n  处理完毕：共 {total} 个，修改 {modified} 个，错误 {errors} 个")
    print("\n=== 修复完成 ===")


if __name__ == '__main__':
    main()
