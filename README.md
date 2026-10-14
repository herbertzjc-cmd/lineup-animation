# Lineup Animation

A broadcast-style football starting-XI graphic for the web, built with **Vite + GSAP**.
An intro animation plays once on page load. The cards arrive face down on the pitch, then each position group is introduced in turn — goalkeeper, defenders, midfielders, forwards: the group's cards rise out of the formation, enlarge into an evenly spaced row while the rest of the pitch dims, flip over in 3D to show portrait, number, position and name, then the figure steps out of its card (head and shoulders past the edges, with a cast shadow), hold for a moment and settle back into place. Click to skip (once for the opening board, again for the players). It then becomes an interactive lineup board:

- Click any player for details in the side panel
- Substitute players: pick from the bench, or drag a substitute onto the pitch
- Drag one starter onto another to swap positions
- Switch formation (4-2-3-1, 4-3-3, 4-4-2, 3-5-2, 4-1-4-1, 3-4-3, 5-3-2)
- Create and edit your own players, with photo upload. Photos, logos and manager pictures can be JPG, PNG, WebP, GIF, BMP, AVIF, HEIC/HEIF (iPhone), TIFF, SVG or ICO; HEIC and TIFF decoders are loaded only when such a file is chosen
- **3D player pop-out**: after the flip the transparent cut-out of the player steps out of the card. Per player you can switch it on or off and adjust the size, horizontal / vertical position and pop depth in the editor (with a live preview); the settings are saved with the player. Photos without a transparent background are detected on upload and kept inside the card
- **Team and manager**: the **Team** button (and the top of every player's editor) has *Team Settings* — team name (Chinese or English; the text is fitted to its space) and an uploadable club logo (PNG / JPG / WebP, original proportions kept) — and *Manager Settings* — name, photo with zoom and position, and **Remove Background**, which cuts the person out locally in the browser (MODNet through transformers.js, no paid API, nothing is uploaded) into a real transparent PNG. Original and cut-out are shown side by side and either can be used. The team name, logo, manager name and photo appear on the side panel of the lineup screen. Pictures are stored in IndexedDB, everything else in `localStorage`
- **Special players**: switch on "Special Player" in the editor for a gold flash-card entrance (glow and sparks, slower flip with a gold sheen, a diagonal light beam on reveal), then a permanent animated gold frame and holographic sheen. Any number of players can be special; the setting is saved with the player
- Team colors: 10 presets or any custom color (text switches between white and dark automatically so it stays readable)
- **▶ Play** replays the opening animation with the current lineup
- Your changes are saved in the browser (`localStorage`)

The 1920×1080 stage scales to fit any screen.

**Live demo:** https://herbertzjc-cmd.github.io/lineup-animation/

## Run it locally

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
git clone https://github.com/herbertzjc-cmd/lineup-animation.git
cd lineup-animation
npm install
npm run dev
```

Open the address printed in the terminal (usually http://localhost:5173/).

Add `?intro=0` to the URL to skip the intro while developing.

To get static files you can host anywhere: `npm run build`, then upload the `dist/` folder.

### How the groups are formed

Groups follow the lines of the current formation: the first line is the defence, the last line is the attack and every line in between is midfield — so 4-3-3 is 1 / 4 / 3 / 3, 4-4-2 is 1 / 4 / 4 / 2 and 4-2-3-1 is 1 / 4 / 5 / 1. The enlargement adapts to the group size so the row never overlaps. Timings (`RISE`, `HOLD`, `RETURN`, …) are constants at the top of `src/components/pitch.js`.

## Use your own team

You only need to edit data and assets — no code changes:

- **`src/data/players.json`** — team name, default colour (`team.colors.primary`; viewers can change it on the page with **Colors**), coach, formation, the 11 starters (`lineup.slots`, goalkeeper first, then each line left to right) and the full squad (`players`). Add `"special": true` to a player to give them the gold entrance.
- **`public/`** — put images here and reference them from the JSON:
  - `team.logo` — a single-colour silhouette SVG works best (it is drawn red on the light side and white on the red panel)
  - `photo` — a transparent PNG/SVG cut-out of the player (players without one get a generic placeholder portrait). A cut-out is needed for the pop-out effect; set `"photoAlpha": false` on a player whose photo has a solid background to keep it inside the card. Optional `"pop": { "on": true, "scale": 100, "x": 0, "y": 0, "depth": 60 }` tunes the effect
  - `flag` — a small flag image next to the portrait (flags for a few common nationalities are built in; add your own in `public/flags/`)

After editing `players.json`, press **Reset** on the page (saved lineups in your browser take priority over the file).

## 如何添加球员照片（批量自动抠图）

`tools/cutout.py` 会把原始球员照片批量处理成**背景透明、尺寸统一**的 PNG（默认 800×1000，人物底部居中对齐），让所有球员在卡片里大小、位置一致。

**一次性准备**（需要 Python 3.9 以上）：

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows：.venv\Scripts\activate
pip install -r requirements.txt
```

**添加球员照片**：

1. 把原始照片（jpg / jpeg / png / webp / bmp）放进 `assets/raw/`，文件名建议用球员 id，比如 `salah.jpg`
2. 运行 `npm run cutout`，结果输出到 `assets/players/`，文件名相同、扩展名为 `.png`（如 `salah.png`）
3. 在 `src/data/players.json` 里给对应球员填写文件名：`"photo": "players/salah.png"`

之后每次只会处理**新添加**的照片，已处理过的会被跳过。首次运行时 rembg 会自动下载模型（约 170 MB，需要联网），以后可离线使用。如果提示找不到 `python` 命令，请先激活上面的虚拟环境，或把 `package.json` 里 `cutout` 脚本的 `python` 改成 `python3`。

**常用参数**（用 `npm run cutout -- 参数` 传入）：

| 参数 | 作用 |
| --- | --- |
| `--preview` | 额外生成 `assets/players/_preview.png`：把所有结果排在棋盘格背景上，一眼检查抠图质量 |
| `--model birefnet-portrait` | 人像更精细（模型很大，可能接近 1 GB，首次下载较久）；`u2net_human_seg` 最快；默认 `isnet-general-use` |
| `--alpha-matting` | 边缘精修，头发细节更好但更慢 |
| `--force` | 重新处理已存在的输出文件 |
| `--width` / `--height` / `--padding` | 统一画布大小（默认 800×1000）和人物四周边距（默认 8px） |
| `--no-canvas` | 只裁剪到人物轮廓，不放到统一画布 |
| `--input` / `--output` | 修改输入、输出目录 |

处理流程：去背景 → 只保留最大的人物区域（面积超过最大区域 15% 的部分也保留，避免手臂被误删）→ 按轮廓裁剪并留边距 → 等比缩放到统一画布。单张图片失败不会中断批处理，最后会打印"处理 / 跳过 / 失败"的数量和失败的文件名。`assets/players/` 里的图片开发时会按 `/players/文件名` 提供，构建时自动拷进发布目录；`assets/raw/` 里的原图不会被提交到 Git。

## Project layout

```
src/data/players.json     squad, lineup, team settings
src/store.js              lineup state + localStorage; team / manager details
src/imageutil.js          reading uploaded pictures in any common format
src/idb.js                IndexedDB storage for the logo and manager photos
src/bgremove.js           in-browser background removal (loaded on demand)
src/theme.js              team colour theming (contrast-aware)
src/components/           intro, pitch, side panel, toolbar, player tile
src/components/views/     panel views: player detail, bench, lineup list, editor
src/timeline.js           GSAP master timeline for the page-load animation
src/app.js                interaction wiring (select, swap, drag, formation)
```

## Contributors

- [@herbertzjc-cmd](https://github.com/herbertzjc-cmd) — author
- [@Kevin07-sooya](https://github.com/Kevin07-sooya) — contributor

## License

Free to use as-is, but **not to modify** the code — see [LICENSE](LICENSE).
Customising `players.json` and `public/` is allowed. Club and player names in the sample data are placeholders and belong to their owners.

---

### 中文简介

足球转播风格的首发阵容网页(Vite + GSAP)。打开页面播放一次开场动画,之后可以点击球员查看详情、换人(点选或拖拽)、切换阵型、切换/自定义球队配色、自建和编辑球员。

运行:安装 Node.js 22+,然后 `npm install && npm run dev`。换成自己的球队:只改 `src/data/players.json` 和 `public/` 里的图片。许可:可以免费使用,但不得修改代码(见 LICENSE)。
