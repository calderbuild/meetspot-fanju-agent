---
workflow: product-launch-video
flow: automation
storyboard: no
message: "每人说一句要求，先划掉不合适的店并写清理由，再出一张大家都能吃的点菜单"
destination: contest submission (支付宝·智能体涌现奖)
aspect: "16:9"
language: zh-CN
length: 60-90s
angle: show-it-as-is product walkthrough of the 示例饭局 flow
---

## Intent

Feature the live app's own captured screens as the video's assets. No invented UI.
Story: the group-chat problem, then 谁来吃 / 去哪吃 / 点什么, then rules are checked by code,
every rejection has a reason, and 过敏原请向店员确认.

## Customizations

- Voiceover: ElevenLabs `eleven_v4`, voice Will, sped up with ffmpeg atempo 1.15 (v4 ignores speed).
- Burned-in Chinese captions from the take's character alignment.
- No background music.
- Look: the cover's palette and type (docs/cover/cover.html).

## Build

1. `python3 scripts/vo.py --tempo 1.15` records any missing takes (never re-bills an existing one; `--redo s4` forces one) and writes `audio/timing.json`.
2. `python3 scripts/build.py` writes `index.html` from `scripts/template.html` + timing.
3. `npx hyperframes check`, then `npx hyperframes render --quality high --fps 30 --output intro.mp4`.

Screens: `capture/raw/` are Chrome captures of https://render.qmuse.pub/p/muse/3163078624095246
(示例饭局 -> 天兴居 -> 示例菜单 -> 出点菜单), stitched by scroll offset into `assets/plate-a.png` and
`assets/plate-b.png`; `assets/slip.png` is the final 点菜单.
