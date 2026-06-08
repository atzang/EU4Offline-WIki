#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 index.html:
1. 将侧边栏「最近更改」动态列表替换为静态常用页面列表（含可成立国家）
2. 去除 AdSense ins 块（footer 里的移动端广告）
3. 去除百度统计脚本
4. 修复一些残留的绝对链接
"""

import re

fpath = r"D:\Downloads\www.eu4cn.com\index.html"

with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

original = content

# ── 1. 替换侧边栏动态列表为静态常用页面 ──────────────────────────
OLD_SIDEBAR = '''				<div
		class="live-recent"
		data-article-ns="0|4|10|12|14"
		data-talk-ns="1|5|7|9|11|13|15"
	>
		<div class="live-recent-header">
		<ul class="nav nav-tabs">
			<li class="nav-item">
				<a href="javascript:" class="nav-link active" id="liberty-recent-tab1">
					最近更改				</a>
			</li>
			<li class="nav-item">
				<a href="javascript:" class="nav-link" id="liberty-recent-tab2">
					最近讨论				</a>
			</li>
		</ul>
		</div>
		<div class="live-recent-content">
			<ul class="live-recent-list" id="live-recent-list">
				<li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li><li><span class="recent-item">&nbsp;</span></li>			</ul>
		</div>
		<div class="live-recent-footer">
			<a href="./wiki/Special:最近更改.html" title="Special:最近更改"><span class="label label-info">查看更多</span></a>		</div>
	</div>'''

NEW_SIDEBAR = '''				<div class="live-recent">
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
					<a href="./wiki/可成立国家.html" title="可成立国家" style="font-weight:bold;color:#103D8F;">&#9733; 可成立国家</a>
				</span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/国家.html" title="国家">国家列表</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/成就.html" title="成就">成就</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/任务.html" title="任务">任务</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/入门指南.html" title="入门指南">入门指南</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/机制.html" title="机制">游戏机制</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/控制台指令.html" title="控制台指令">控制台指令</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/理念组.html" title="理念组">理念组</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/DLC.html" title="DLC">DLC 列表</a></span></li>
				<li style="padding:4px 8px;"><span class="recent-item"><a href="./wiki/省份.html" title="省份">省份</a></span></li>
			</ul>
		</div>
		<div class="live-recent-footer">
			<a href="./wiki/可成立国家.html" title="可成立国家"><span class="label label-info">查看可成立国家</span></a>
		</div>
	</div>'''

if OLD_SIDEBAR in content:
    content = content.replace(OLD_SIDEBAR, NEW_SIDEBAR)
    print("[OK] 侧边栏已替换")
else:
    # 宽松匹配：用正则替换整个 live-recent 块
    pattern = r'<div\s+class="live-recent"\s+data-article-ns="[^"]*"\s+data-talk-ns="[^"]*"\s*>.*?</div>\s*</div>'
    new_content = re.sub(pattern, NEW_SIDEBAR, content, flags=re.DOTALL)
    if new_content != content:
        content = new_content
        print("[OK] 侧边栏已替换（正则）")
    else:
        print("[WARN] 侧边栏未找到，跳过")

# ── 2. 去除 footer AdSense 块 ──────────────────────────────────
content = re.sub(
    r'<div class="bottom-ads[^"]*">\s*<!--.*?-->\s*<ins class="adsbygoogle[^"]*".*?</ins>\s*<script[^>]*>\s*\(adsbygoogle[^<]*</script>\s*</div>',
    '',
    content,
    flags=re.DOTALL
)
print("[OK] footer AdSense 已去除")

# ── 3. 去除百度统计脚本 ─────────────────────────────────────────
content = re.sub(
    r'<script>\s*var _hmt = _hmt \|\|.*?</script>',
    '',
    content,
    flags=re.DOTALL
)
print("[OK] 百度统计脚本已去除")

# ── 4. 去除 sidebar 残留的 AdSense 侧栏广告（已被 fix_links 处理过了，再保险一遍）
content = re.sub(
    r'<!-- 侧栏 -->\s*<ins class="adsbygoogle".*?</ins>\s*<script[^>]*>\s*\(adsbygoogle[^<]*</script>',
    '<!-- 侧栏广告已移除 -->',
    content,
    flags=re.DOTALL
)

# ── 5. 修复版本链接（1.37_版本.html 需要指向 wiki/）──────────────
# index.html 中有几个 href="1.37_版本.html" 没有 wiki/ 前缀的
def fix_bare_wiki_link(m):
    href = m.group(1)
    # 只修复没有 ./ 或 http 开头的裸链接
    if not href.startswith('./') and not href.startswith('#') and not href.startswith('http') and not href.startswith('../'):
        return f'href="./wiki/{href}"'
    return m.group(0)

content = re.sub(r'href="([^"]+\.html)"', fix_bare_wiki_link, content)

# ── 6. 清理 ../wiki/ 路径（根目录下不应该有 ../wiki/）──────────────
content = content.replace('href="../wiki/', 'href="./wiki/')
content = content.replace('src="../images/', 'src="./images/')

# ── 保存 ───────────────────────────────────────────────────────
if content != original:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n[DONE] index.html 已更新")
else:
    print("\n[INFO] 无变化")
