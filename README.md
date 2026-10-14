# Lineup Animation

A broadcast-style football starting-XI graphic for the web, built with **Vite + GSAP**.
An intro animation plays once on page load, then the page becomes an interactive lineup board:

- Click any player for details in the side panel
- Substitute players: pick from the bench, or drag a substitute onto the pitch
- Drag one starter onto another to swap positions
- Switch formation (4-2-3-1, 4-3-3, 4-4-2, 3-5-2, 4-1-4-1, 3-4-3, 5-3-2)
- Create and edit your own players, with photo upload
- Team colors: 10 presets or any custom color (text switches between white and dark automatically so it stays readable)
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

| URL parameter | Effect |
| --- | --- |
| `?intro=0` | Skip the intro and go straight to the interactive board |
| `?dev=1` | Show a timeline playback bar for the intro |

To get static files you can host anywhere: `npm run build`, then upload the `dist/` folder.

## Use your own team

You only need to edit data and assets — no code changes:

- **`src/data/players.json`** — team name, default colour (`team.colors.primary`; viewers can change it on the page with **Colors**), coach, formation, the 11 starters (`lineup.slots`, goalkeeper first, then each line left to right) and the full squad (`players`).
- **`public/`** — put images here and reference them from the JSON:
  - `team.logo` — a single-colour silhouette SVG works best (it is drawn red on the light side and white on the red panel)
  - `photo` — a transparent PNG/SVG cut-out of the player
  - `flag` — a small flag image shown next to the photo

After editing `players.json`, press **Reset** on the page (saved lineups in your browser take priority over the file).

## Project layout

```
src/data/players.json     squad, lineup, team settings
src/store.js              lineup state + localStorage
src/theme.js              team colour theming (contrast-aware)
src/components/           intro, pitch, side panel, toolbar, player tile
src/components/views/     panel views: player detail, bench, lineup list, editor
src/timeline.js           GSAP master timeline for the page-load animation
src/app.js                interaction wiring (select, swap, drag, formation)
```

## License

Free to use as-is, but **not to modify** the code — see [LICENSE](LICENSE).
Customising `players.json` and `public/` is allowed. Club and player names in the sample data are placeholders and belong to their owners.

---

### 中文简介

足球转播风格的首发阵容网页(Vite + GSAP)。打开页面播放一次开场动画,之后可以点击球员查看详情、换人(点选或拖拽)、切换阵型、切换/自定义球队配色、自建和编辑球员。

运行:安装 Node.js 22+,然后 `npm install && npm run dev`。换成自己的球队:只改 `src/data/players.json` 和 `public/` 里的图片。许可:可以免费使用,但不得修改代码(见 LICENSE)。
