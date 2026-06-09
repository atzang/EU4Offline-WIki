#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
综合脚本：
1. 为所有 HTML 页面（index.html + wiki/*.html）注入右侧悬浮「返回顶部」按钮
2. 在侧边栏常用页面列表末尾加入加粗的「返回首页」链接
"""

import os
import re
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── 返回顶部按钮 HTML（固定定位，右下角，随滚动显示/隐藏）──────────────────
BACK_TO_TOP_HTML = """
<!-- 返回顶部按钮 -->
<div id="back-to-top" title="返回顶部" onclick="window.scrollTo({top:0,behavior:'smooth'})">&#8679;</div>
<style>
#back-to-top {
    position: fixed;
    right: 24px;
    bottom: 60px;
    width: 44px;
    height: 44px;
    line-height: 40px;
    text-align: center;
    font-size: 26px;
    background: #103D8F;
    color: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.28);
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
    z-index: 9999;
    user-select: none;
}
#back-to-top:hover {
    background: #1a56c4;
}
#back-to-top.show {
    opacity: 1;
    visibility: visible;
}
</style>
<script>
(function(){
    var btn = document.getElementById('back-to-top');
    if(!btn) return;
    window.addEventListener('scroll', function(){
        if(window.scrollY > 200){
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    }, {passive: true});
})();
</script>
"""

# 检查页面是否已有返回顶部按钮（防止重复注入）
ALREADY_INJECTED_MARK = 'id="back-to-top"'

# ─── 侧边栏「返回首页」条目 ────────────────────────────────────────────────
# 在 wiki/ 页面中，首页路径是 ../index.html
HOMEPAGE_LI_WIKI = '\t\t\t\t<li style="padding:5px 8px;border-top:1px solid #ddd;margin-top:4px;"><span class="recent-item"><a href="../index.html" title="返回首页" style="font-weight:bold;color:#103D8F;">&#8962; 返回首页</a></span></li>'
# 在 index.html 中，首页路径是 ./index.html
HOMEPAGE_LI_INDEX = '\t\t\t\t<li style="padding:5px 8px;border-top:1px solid #ddd;margin-top:4px;"><span class="recent-item"><a href="./index.html" title="返回首页" style="font-weight:bold;color:#103D8F;">&#8962; 返回首页</a></span></li>'

# 侧边栏列表结束标记（</ul> 前插入）
SIDEBAR_LIST_END = '\t\t\t</ul>'


def inject_back_to_top(content: str) -> str:
    """在 </body> 前注入返回顶部按钮"""
    if ALREADY_INJECTED_MARK in content:
        return content  # 已注入，跳过
    return content.replace('</body>', BACK_TO_TOP_HTML + '\n</body>', 1)


def inject_homepage_link(content: str, is_index: bool) -> str:
    """在侧边栏列表末尾加入返回首页按钮（防止重复）"""
    homepage_href = './index.html' if is_index else '../index.html'
    if homepage_href in content and '返回首页' in content:
        return content  # 已存在，跳过
    new_li = HOMEPAGE_LI_INDEX if is_index else HOMEPAGE_LI_WIKI
    # 在 SIDEBAR_LIST_END 前插入
    if SIDEBAR_LIST_END in content:
        content = content.replace(SIDEBAR_LIST_END, new_li + '\n' + SIDEBAR_LIST_END, 1)
    return content


def process_file(filepath: str, is_index: bool = False):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        print(f"  [SKIP] 读取失败: {filepath}: {e}")
        return False

    original = content

    # 1. 注入返回顶部按钮
    content = inject_back_to_top(content)

    # 2. 注入侧边栏返回首页链接
    content = inject_homepage_link(content, is_index)

    if content != original:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"  [ERROR] 写入失败: {filepath}: {e}")
            return False
    return False


def main():
    total = 0
    modified = 0

    # 处理 index.html
    index_path = os.path.join(BASE_DIR, 'index.html')
    if os.path.exists(index_path):
        total += 1
        if process_file(index_path, is_index=True):
            modified += 1
            print(f"  [OK] index.html")

    # 批量处理 wiki/ 下所有 HTML
    wiki_dir = os.path.join(BASE_DIR, 'wiki')
    html_files = glob.glob(os.path.join(wiki_dir, '*.html'))
    print(f"\n开始处理 wiki/ 下 {len(html_files)} 个 HTML 文件...")

    for i, filepath in enumerate(html_files):
        total += 1
        if process_file(filepath, is_index=False):
            modified += 1
        if (i + 1) % 1000 == 0:
            print(f"  已处理 {i+1}/{len(html_files)} ...")

    print(f"\n完成！共处理 {total} 个文件，修改了 {modified} 个文件。")


if __name__ == '__main__':
    main()
