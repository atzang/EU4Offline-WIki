#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复 wiki/ 下所有 HTML 文件的侧边栏：
将动态的「最近更改」列表替换为静态的常用页面列表
"""

import os
import re

WIKI_DIR = r"D:\Downloads\www.eu4cn.com\wiki"

# 正则匹配 wiki/ 目录下页面的 live-recent 块
LIVE_RECENT_PATTERN = re.compile(
    r'<div\s*\n\s*class="live-recent"\s*\n\s*data-article-ns="[^"]*"\s*\n\s*data-talk-ns="[^"]*"\s*\n\s*>\s*.*?</div>\s*\n\s*</div>',
    re.DOTALL
)

NEW_SIDEBAR = '''<div class="live-recent">
		<div class="live-recent-header">
		<ul class="nav nav-tabs">
			<li class="nav-item">
				<a href="javascript:" class="nav-link active" id="liberty-recent-tab1">
					常用页面
				</a>
			</li>
		</ul>
		</div>
		<div class="live-recent-content">
			<ul class="live-recent-list" id="live-recent-list" style="padding:4px 0;">
				<li style="padding:5px 8px;"><span class="recent-item">
					<a href="../wiki/可成立国家.html" title="可成立国家" style="font-weight:bold;color:#103D8F;">&#9733; 可成立国家</a>
				</span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/国家.html" title="国家">国家列表</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/成就.html" title="成就">成就</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/任务.html" title="任务">任务</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/入门指南.html" title="入门指南">入门指南</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../index.html" title="首页">返回首页</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/控制台指令.html" title="控制台指令">控制台指令</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/理念组.html" title="理念组">理念组</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/DLC.html" title="DLC">DLC 列表</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="../wiki/省份.html" title="省份">省份</a></span></li>
			</ul>
		</div>
		<div class="live-recent-footer">
			<a href="../wiki/可成立国家.html" title="可成立国家"><span class="label label-info">查看可成立国家</span></a>
		</div>
	</div>'''

def fix_sidebar(content):
    new_content = LIVE_RECENT_PATTERN.sub(NEW_SIDEBAR, content)
    return new_content

def main():
    html_files = [f for f in os.listdir(WIKI_DIR) if f.lower().endswith('.html')]
    total = len(html_files)
    modified = 0
    print(f"共 {total} 个 HTML 文件，开始替换侧边栏...")

    for fname in html_files:
        fpath = os.path.join(WIKI_DIR, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
        except Exception as e:
            continue

        new_content = fix_sidebar(content)
        if new_content != content:
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                modified += 1
            except Exception as e:
                pass

        if modified % 1000 == 0 and modified > 0:
            print(f"  已修改 {modified}...")

    print(f"完成：共修改 {modified}/{total} 个文件")

if __name__ == '__main__':
    main()
