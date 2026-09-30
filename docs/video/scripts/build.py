"""Generate index.html from audio/timing.json.

Scene order and VO come from SCRIPT.md (via timing.json); every screen is a real
capture of the live app stitched into assets/plate-a.png, plate-b.png, slip.png.
Plate coordinates below are pixels in those images.
usage: python3 scripts/build.py
"""

import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
T = json.loads((ROOT / "audio" / "timing.json").read_text())
LEAD, GAP, TAIL = 0.4, 0.55, 2.2

# scene start times
starts, t = {}, LEAD
for sid, s in T.items():
    starts[sid] = round(t, 3)
    t += s["duration"] + GAP
TOTAL = round(t - GAP + TAIL, 2)


def cue(sid, i):
    """Global start time of cue i in scene sid."""
    return round(starts[sid] + T[sid]["cues"][i]["start"], 3)


def end(sid):
    return round(starts[sid] + T[sid]["duration"] + GAP, 3)


els, tl = [], []  # html fragments, gsap lines


def clip(cid, start, dur, inner, cls="", track=1):
    els.append(
        f'<section id="{cid}" class="clip {cls}" data-start="{start}" data-duration="{round(dur, 3)}" '
        f'data-track-index="{track}">{inner}</section>'
    )


def fade_in(sel, at, y=24, d=0.6):
    tl.append(
        f'tl.fromTo("{sel}", {{opacity: 0, y: {y}}}, {{opacity: 1, y: 0, duration: {d}, ease: "power3.out"}}, {at});'
    )


def scroll(sel, at, y, d):
    tl.append(
        f'tl.to("{sel}", {{y: {-y}, duration: {d}, ease: "power2.inOut"}}, {at});'
    )


def mark(mid, x, y, w, h):
    return f'<div id="{mid}" class="mark" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"></div>'


def show_mark(mid, at):
    tl.append(
        f'tl.fromTo("#{mid}", {{opacity: 0, scale: 1.04}}, {{opacity: 1, scale: 1, duration: 0.35, ease: "power2.out"}}, {at});'
    )


def hide(sel, at):
    tl.append(f'tl.to("{sel}", {{opacity: 0, duration: 0.3}}, {at});')


def left(cid, start, dur, step, title, lines, line_times):
    sub = "".join(
        f'<p id="{cid}-l{i}" class="sub">{escape(x)}</p>' for i, x in enumerate(lines)
    )
    stepline = f'<div id="{cid}-step" class="step">{escape(step)}</div>' if step else ""
    clip(
        cid,
        start,
        dur,
        f'<div class="left">{stepline}<h1 id="{cid}-h">{escape(title)}</h1>{sub}</div>',
    )
    if step:
        fade_in(f"#{cid}-step", start + 0.05)
    fade_in(f"#{cid}-h", start + 0.12)
    for i, at in enumerate(line_times):
        fade_in(f"#{cid}-l{i}", at, y=16)


# ---------- s1: the problem (typographic, quotes are the sample party's real lines) ----------
s = "s1"
quotes = [
    ("小王", "人均别超过 80，最近手头紧"),
    ("小李", "我不吃海鲜，别的都行"),
    ("小张", "我吃素"),
    ("小陈", "花生过敏，想吃点辣的"),
]
qhtml = "".join(
    f'<div id="q{i}" class="quote" style="top:{300 + i * 160}px;left:{1010 + (i % 2) * 110}px">'
    f"<b>{n}</b><span>“{escape(q)}”</span></div>"
    for i, (n, q) in enumerate(quotes)
)
clip(
    "s1a",
    0,
    cue(s, 1),
    '<div class="close"><div id="s1-brand" class="step">MeetSpot 饭局 Agent</div>'
    '<h1 id="s1-me">我是 Calder</h1><p id="s1-me2" class="sub">在读学生，这个作品是我一个人做的</p></div>',
)
fade_in("#s1-brand", 0.1)
fade_in("#s1-me", starts[s] + 0.1)
fade_in("#s1-me2", starts[s] + 1.2, y=16)
clip(
    "s1",
    cue(s, 1),
    end(s) - cue(s, 1),
    '<div class="left"><div id="s1-k" class="step">约朋友吃饭</div>'
    '<h1 id="s1-h">最累的不是吃，<span class="nl">是在群里来回商量</span></h1>'
    '<p id="s1-l0" class="sub">到了店里，点菜又得再来一轮</p></div>' + qhtml,
)
fade_in("#s1-k", cue(s, 1))
fade_in("#s1-h", cue(s, 1) + 0.1)
for i, at in enumerate([cue(s, 2), cue(s, 2) + 1.1, cue(s, 2) + 2.2, cue(s, 3)]):
    fade_in(f"#q{i}", at, y=30)
fade_in("#s1-l0", cue(s, 4))

# ---------- s2-s4: plate A (谁来吃 -> 去哪吃) in one scrolling card ----------
a0, a1 = starts["s2"], end("s4")
marks_a = (
    mark("m-row0", 0, 1692, 812, 97)
    + mark("m-row1", 0, 1789, 812, 97)
    + mark("m-row2", 0, 1886, 812, 97)
    + mark("m-row3", 0, 1983, 812, 96)
    + mark("m-zhao", 28, 2330, 420, 90)
    + "".join(mark(f"m-tag{i}", 34, 3021 + i * 226, 212, 50) for i in range(3))
)
clip(
    "card-a",
    a0,
    a1 - a0,
    f'<div class="card"><div id="pa" class="plate" data-layout-allow-overflow><img src="assets/plate-a.png" alt="">{marks_a}</div></div>',
    track=2,
)
fade_in("#card-a .card", a0, y=40, d=0.7)
tl.append(f'tl.set("#pa", {{y: -300}}, {a0});')
scroll("#pa", a0 + 1.0, 620, starts["s3"] - a0 - 1.2)
scroll("#pa", starts["s3"], 1560, 1.0)
for i in range(4):
    show_mark(f"m-row{i}", cue("s3", 1) + 0.25 + i * 0.55)
for i in range(4):
    hide(f"#m-row{i}", starts["s4"])
scroll("#pa", starts["s4"] + 0.1, 2100, 1.2)
show_mark("m-zhao", cue("s4", 2))
hide("#m-zhao", cue("s4", 3) - 0.2)
scroll("#pa", cue("s4", 3) - 0.1, 2860, 1.0)
for i in range(3):
    show_mark(f"m-tag{i}", cue("s4", 3) + 1.0 + i * 0.3)

left(
    "s2",
    starts["s2"],
    end("s2") - starts["s2"],
    "1/3",
    "谁来吃",
    ["每人说一句自己的要求", "大白话就行"],
    [cue("s2", 2), cue("s2", 2) + 1.2],
)
left(
    "s3",
    starts["s3"],
    end("s3") - starts["s3"],
    "2/3",
    "去哪吃",
    ["先把每个人的话整理成条件", "列出来，大家核对"],
    [cue("s3", 1), cue("s3", 2)],
)
left(
    "s4",
    starts["s4"],
    end("s4") - starts["s4"],
    "2/3",
    "先划掉不合适的店",
    ["每一家都写清是谁的哪条要求", "留下的店标注：按品类初筛，未核实"],
    [cue("s4", 1), cue("s4", 3)],
)

# ---------- s5: plate B (点什么, sample menu) ----------
b0, b1 = starts["s5"], end("s5")
clip(
    "card-b",
    b0,
    b1 - b0,
    f'<div class="card"><div id="pb" class="plate" data-layout-allow-overflow><img src="assets/plate-b.png" alt="">{mark("m-price", 0, 1604, 812, 76)}</div></div>',
    track=2,
)
tl.append(f'tl.set("#pb", {{y: -20}}, {b0});')
fade_in("#card-b .card", b0, y=0, d=0.4)
scroll("#pb", b0 + 0.6, 790, 1.4)
scroll("#pb", cue("s5", 2) - 0.5, 1000, 0.8)
show_mark("m-price", cue("s5", 2) + 0.3)
scroll("#pb", cue("s5", 3), 1150, b1 - cue("s5", 3) - 0.3)
left(
    "s5",
    b0,
    b1 - b0,
    "3/3",
    "点什么",
    [
        "只读照片上真有的菜名和价格",
        "读错的地方直接改",
        "示例菜单：一张真实的餐厅菜单照片",
    ],
    [cue("s5", 1), cue("s5", 2), cue("s5", 3)],
)

# ---------- s6-s7: the final 点菜单 ----------
c0, c1 = starts["s6"], end("s7")
slip_marks = mark("m-total", 12, 572, 588, 80) + mark("m-allergy", 12, 710, 588, 60)
clip(
    "card-c",
    c0,
    c1 - c0,
    f'<div id="slipwrap" class="slip"><img src="assets/slip.png" alt="">{slip_marks}</div>',
    track=2,
)
fade_in("#slipwrap", c0, y=40, d=0.7)
show_mark("m-total", cue("s6", 1) + 1.4)
hide("#m-total", starts["s7"])
show_mark("m-allergy", cue("s7", 4) - 0.1)
left(
    "s6",
    c0,
    end("s6") - c0,
    "",
    "一张点菜单",
    ["每道菜下面写着谁能吃", "总价按菜单价格算出，人均 ¥64"],
    [cue("s6", 1), cue("s6", 2)],
)
clip(
    "s7",
    starts["s7"],
    end("s7") - starts["s7"],
    '<div class="left"><div id="s7-a" class="split"><span class="tag">模型</span>听懂每个人的话，读菜单照片</div>'
    '<div id="s7-b" class="split"><span class="tag code">代码</span>逐条检查规则，每次否决都有理由</div>'
    '<div id="s7-c" class="split"><span class="tag warn">过敏</span>只做提示，请向店员确认</div></div>',
)
fade_in("#s7-a", starts["s7"] + 0.2)
fade_in("#s7-b", cue("s7", 1))
fade_in("#s7-c", cue("s7", 3))

# ---------- s8: close ----------
e0 = starts["s8"]
clip(
    "s8",
    e0,
    TOTAL - e0,
    '<div class="close"><div id="s8-b" class="step">MeetSpot 饭局 Agent</div>'
    '<h1 id="s8-h">几个人吃饭，去哪、点什么，一次谈拢</h1>'
    '<p id="s8-u" class="url">render.qmuse.pub/p/muse/3163078624095246</p></div>',
)
fade_in("#s8-b", e0 + 0.05)
fade_in("#s8-h", e0 + 0.2)
fade_in("#s8-u", e0 + 1.2, y=12)

# ---------- voiceover + burned-in captions ----------
audio = "".join(
    f'<audio id="vo-{sid}" src="audio/vo/{sid}.mp3" data-start="{starts[sid]}" data-duration="{s["duration"]}" '
    f'data-track-index="10" data-volume="1"></audio>'
    for sid, s in T.items()
)
caps = []
for sid, s in T.items():
    for i, c in enumerate(s["cues"]):
        st = round(starts[sid] + c["start"], 3)
        nxt = s["cues"][i + 1]["start"] if i + 1 < len(s["cues"]) else c["end"] + 0.25
        dur = round(max(nxt, c["end"]) - c["start"], 3)
        caps.append(
            f'<div id="cap-{sid}-{i}" class="clip cap" data-start="{st}" data-duration="{dur}" data-track-index="20">'
            f"<span>{escape(c['text'])}</span></div>"
        )

html = (ROOT / "scripts" / "template.html").read_text()
html = (
    html.replace("{{TOTAL}}", str(TOTAL))
    .replace("{{CLIPS}}", "\n      ".join(els))
    .replace("{{AUDIO}}", audio)
)
html = html.replace("{{CAPTIONS}}", "\n      ".join(caps)).replace(
    "{{TIMELINE}}", "\n      ".join(tl)
)
(ROOT / "index.html").write_text(html)
print("wrote index.html, total", TOTAL, "s; scene starts", starts)
