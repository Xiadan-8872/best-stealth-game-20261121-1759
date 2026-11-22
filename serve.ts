// Local static server for play-testing NIGHTSHIFT — The Meridian Vault.
// Serves game/ at the root so the ES modules load offline, no build step.
//
// Run with:  node serve.ts            (http://localhost:8080)
//             node serve.ts --port 9000

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, 'game');
const repoRoot = here;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

function parsePort(argv) {
  const idx = argv.indexOf('--port');
  if (idx >= 0 && argv[idx + 1]) {
    const port = Number(argv[idx + 1]);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  }
  const env = Number(process.env.PORT);
  if (Number.isInteger(env) && env > 0 && env < 65536) return env;
  return 8080;
}

const port = parsePort(process.argv.slice(2));

function resolveFile(urlPath) {
  let path = decodeURIComponent(urlPath.split('?')[0]);
  if (path === '/' || path === '') path = '/index.html';
  // Screenshots and repo files live outside game/; everything else is game/.
  const base = path.startsWith('/screenshots/') ? repoRoot : root;
  const full = resolve(join(base, normalize(path)));
  if (!full.startsWith(resolve(base))) return null;
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  return full;
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url || '/');
  if (!file) {
    console.log('404 ' + (req.url || '/'));
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + (req.url || '/'));
    return;
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Failed to read file');
  }
});

server.listen(port, () => {
  console.log('NIGHTSHIFT — The Meridian Vault');
  console.log('Serving game/ at http://localhost:' + port + '/');
  console.log('Staged shots: http://localhost:' + port + '/?shot=start&seed=1 (start|play|chase|end)');
});
