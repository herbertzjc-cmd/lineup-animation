import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Cut-out photos made by `npm run cutout` live in assets/players. This serves them at
// /players/<file> while developing and copies them into the build, so players.json can refer to
// them as "players/<file>.png" just like the images in public/players.
function playerCutouts() {
  const dir = path.resolve('assets/players');
  const wanted = (name) => /\.(png|webp)$/i.test(name) && !name.startsWith('_');
  let outDir;
  return {
    name: 'player-cutouts',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^\/players\/([^/?#]+)/.exec(req.url || '');
        const file = m && path.join(dir, decodeURIComponent(m[1]));
        if (file && wanted(path.basename(file)) && fs.existsSync(file)) {
          res.setHeader('Content-Type', file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/webp');
          fs.createReadStream(file).pipe(res);
        } else {
          next();
        }
      });
    },
    writeBundle() {
      if (!fs.existsSync(dir)) return;
      fs.mkdirSync(path.join(outDir, 'players'), { recursive: true });
      for (const name of fs.readdirSync(dir).filter(wanted)) {
        fs.copyFileSync(path.join(dir, name), path.join(outDir, 'players', name));
      }
    },
  };
}

// Relative base so the build works from any URL (GitHub Pages subpath, a folder, etc.).
export default defineConfig({
  base: './',
  plugins: [playerCutouts()],
  // The background-removal and HEIC libraries are loaded on demand in their own chunks, so they are allowed to be big.
  build: { chunkSizeWarningLimit: 1500 },
});
