#!/usr/bin/env node
'use strict';

/**
 * Zero-dependency static file server for local preview of the MahaKaushalya
 * frontend portals. Serves the project root so BOTH portals and the shared/
 * auth module resolve:
 *
 *   /client/trainee-portal/...         -> trainee portal pages
 *   /client/admin-portal/...           -> government/admin portal pages
 *   /shared/auth.js                    -> shared auth module loaded by both
 *
 * The backend API is NOT served here — the merged Express app keeps running
 * separately on http://localhost:5000 (same origin policy not needed; CORS
 * already allows http://127.0.0.1:5500 and http://localhost:5500).
 *
 * Note: our frontend modules import '../../shared/auth.js' relative to each
 * portal folder, so we also expose /shared -> <root>/shared for the portals'
 * own directory-relative lookups.
 *
 * Usage: node preview-server.js [port]   (default 5500)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Local-dev API target for shared/auth.js (deployed builds are same-origin and
// need no override). Served as a virtual module so it exists before the
// portals' own ES-module imports run.
const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';

const ROOT = __dirname;
const PORT = parseInt(process.argv[2], 10) || 5500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    // Simple launcher page linking both portals
    return send(
      res,
      200,
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MahaKaushalya — Portal Launcher</title>
<style>
  body{font-family:'Noto Sans','Segoe UI',sans-serif;background:#f8f9ff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .wrap{max-width:760px;padding:40px;width:100%}
  h1{color:#001435;margin:0 0 6px}
  p.sub{color:#5a6572;margin:0 0 28px}
  .flag{height:6px;background:linear-gradient(90deg,#FF9933,#fff,#138808);border-radius:3px;margin-bottom:28px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  a.card{display:block;background:#fff;border-radius:14px;padding:26px;text-decoration:none;color:inherit;box-shadow:0 4px 18px rgba(0,0,0,.07);transition:transform .15s,box-shadow .15s}
  a.card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.12)}
  .card h2{margin:0 0 8px;font-size:18px;color:#001435}
  .card p{margin:0;font-size:13px;color:#5a6572;line-height:1.5}
  .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.05em;padding:3px 8px;border-radius:999px;margin-bottom:12px}
  .b-trainee{background:#dce9ff;color:#0f3876}
  .b-admin{background:#ffdbce;color:#7f2b00}
  .api{margin-top:30px;font-size:12px;color:#8a93a0;text-align:center}
  .api code{background:#eef1f6;padding:2px 6px;border-radius:4px}
</style>
</head>
<body>
<div class="wrap">
  <div class="flag"></div>
  <h1>MahaKaushalya</h1>
  <p class="sub">Post-Training Outcome Tracking System &middot; Govt. of Maharashtra (MSSDS)</p>
  <div class="grid">
    <a class="card" href="/client/trainee-portal/index.html">
      <span class="badge b-trainee">TRAINEE PORTAL</span>
      <h2>Trainee Dashboard</h2>
      <p>Register, log in, submit placement outcomes, and respond to follow-ups. Calls <code>/api/trainee/*</code>.</p>
    </a>
    <a class="card" href="/client/admin-portal/login.html">
      <span class="badge b-admin">ADMIN PORTAL</span>
      <h2>Government / Admin</h2>
      <p>Overview, trainee records, non-responder queue, analytics &amp; verification. Calls <code>/api/admin/*</code>.</p>
    </a>
  </div>
  <p class="api">Backend API: <code>${API_BASE}/health</code> &mdash; merged Express server must be running.</p>
</div>
</body>
</html>`,
      { 'Content-Type': 'text/html; charset=utf-8' }
    );
  }

  // Virtual module: injects the dev API base into shared/auth.js before it loads.
  // shared/auth.js reads window.MAHAKAUSHALYA_API_BASE_URL at module top level,
  // so prepending one JS line is the simplest reliable override.
  if (urlPath === '/shared/auth.js') {
    const authPath = path.join(ROOT, 'shared', 'auth.js');
    fs.readFile(authPath, (err, data) => {
      if (err) return send(res, 404, 'Not found: ' + urlPath);
      const body = `window.MAHAKAUSHALYA_API_BASE_URL = ${JSON.stringify(API_BASE)};\n` + data.toString('utf8');
      send(res, 200, body, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' });
    });
    return;
  }

  // Prevent path traversal
  const safe = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT, safe);
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden');
  }

  // Directory -> try index.html
  try {
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    return send(res, 404, 'Not found: ' + urlPath);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found: ' + urlPath);
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
  });
});

server.listen(PORT, () => {
  console.log(`MahaKaushalya preview server (static frontend) on http://localhost:${PORT}`);
  console.log('  Trainee portal : /client/trainee-portal/index.html');
  console.log('  Admin portal   : /client/admin-portal/login.html');
});
