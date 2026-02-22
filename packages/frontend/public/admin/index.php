<?php
require_once __DIR__ . '/../api/_auth.php';
$loggedIn = isAuthenticated();
// Override JSON content type from _config.php — this is an HTML page
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>SwipeHot Admin</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0a0a0a; --surface: #141414; --border: #2a2a2a;
  --text: #e5e5e5; --text-dim: #888; --text-bright: #fff;
  --pink: #FE2C55; --green: #00F891; --cyan: #00F0FF; --gold: #FFD740;
  --red: #ff4444; --orange: #ff9800;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
a { color: var(--cyan); text-decoration: none; }

/* Login */
.login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
.login-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 40px; width: 100%; max-width: 360px; text-align: center; }
.login-card h1 { font-size: 22px; color: var(--pink); margin-bottom: 8px; }
.login-card p { color: var(--text-dim); font-size: 13px; margin-bottom: 24px; }
.login-card input { width: 100%; padding: 12px 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 15px; margin-bottom: 16px; outline: none; }
.login-card input:focus { border-color: var(--pink); }
.login-card button { width: 100%; padding: 12px; background: var(--pink); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
.login-card button:hover { opacity: 0.9; }
.login-error { color: var(--red); font-size: 13px; margin-bottom: 12px; display: none; }

/* Dashboard Layout */
.dash { max-width: 1200px; margin: 0 auto; padding: 16px; }
.header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.header h1 { font-size: 18px; color: var(--pink); white-space: nowrap; }
.header-right { display: flex; align-items: center; gap: 8px; }
.period-pills { display: flex; gap: 4px; }
.pill { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--text-dim); font-size: 13px; cursor: pointer; white-space: nowrap; }
.pill.active { background: var(--pink); color: #fff; border-color: var(--pink); }
.btn-logout { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-dim); font-size: 12px; cursor: pointer; }
.btn-logout:hover { border-color: var(--red); color: var(--red); }

/* KPI Cards */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.kpi-label { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 700; color: var(--text-bright); font-variant-numeric: tabular-nums; }
.kpi-delta { font-size: 12px; margin-top: 4px; }
.kpi-delta.up { color: var(--green); }
.kpi-delta.down { color: var(--red); }
.kpi-delta.flat { color: var(--text-dim); }

/* Section */
.section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }

/* Funnel */
.funnel-step { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.funnel-label { width: 120px; font-size: 13px; color: var(--text-dim); flex-shrink: 0; }
.funnel-bar-wrap { flex: 1; height: 28px; background: var(--bg); border-radius: 6px; overflow: hidden; position: relative; }
.funnel-bar { height: 100%; background: var(--pink); border-radius: 6px; transition: width 0.6s ease; min-width: 2px; }
.funnel-value { font-size: 13px; font-weight: 600; color: var(--text-bright); width: 110px; text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.funnel-rate { color: var(--text-dim); font-weight: 400; }

/* Two columns */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }

/* Device bars */
.device-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.device-name { width: 70px; font-size: 13px; color: var(--text-dim); }
.device-bar-wrap { flex: 1; height: 20px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.device-bar { height: 100%; background: var(--cyan); border-radius: 4px; transition: width 0.6s ease; }
.device-pct { width: 40px; font-size: 13px; color: var(--text-bright); text-align: right; font-variant-numeric: tabular-nums; }

/* Session depth */
.depth-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.depth-label { width: 90px; font-size: 13px; color: var(--text-dim); }
.depth-bar-wrap { flex: 1; height: 18px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.depth-bar { height: 100%; background: var(--gold); border-radius: 4px; transition: width 0.6s ease; }
.depth-count { width: 50px; font-size: 13px; color: var(--text-bright); text-align: right; font-variant-numeric: tabular-nums; }

/* A/B Tests */
.ab-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.ab-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.ab-name { font-size: 16px; font-weight: 600; color: var(--text-bright); }
.ab-status { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.ab-status.running { background: rgba(0,248,145,0.15); color: var(--green); }
.ab-status.paused { background: rgba(255,152,0,0.15); color: var(--orange); }
.ab-status.draft { background: rgba(136,136,136,0.15); color: var(--text-dim); }
.ab-status.completed { background: rgba(0,240,255,0.15); color: var(--cyan); }
.ab-variants-label { font-size: 12px; color: var(--text-dim); margin-bottom: 10px; }
.ab-variant-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; padding: 8px 10px; border-radius: 8px; background: var(--surface); }
.ab-variant-row.winner { border: 1px solid var(--green); }
.ab-variant-name { font-size: 14px; font-weight: 500; color: var(--text-bright); min-width: 90px; }
.ab-variant-rate { font-size: 14px; font-weight: 600; color: var(--text-bright); font-variant-numeric: tabular-nums; }
.ab-variant-sessions { font-size: 12px; color: var(--text-dim); }
.ab-variant-badge { font-size: 11px; font-weight: 600; color: var(--green); margin-left: auto; }
.ab-significance { font-size: 12px; color: var(--text-dim); margin-top: 8px; padding: 8px 10px; background: var(--surface); border-radius: 6px; }
.ab-significance.significant { color: var(--green); }
.ab-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.ab-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 12px; cursor: pointer; }
.ab-btn:hover { border-color: var(--text); }
.ab-btn.start { border-color: var(--green); color: var(--green); }
.ab-btn.pause { border-color: var(--orange); color: var(--orange); }
.ab-btn.complete { border-color: var(--cyan); color: var(--cyan); }
.ab-btn.delete { border-color: var(--red); color: var(--red); }

/* New test form */
.new-test-form { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-top: 12px; display: none; }
.new-test-form.visible { display: block; }
.form-row { margin-bottom: 12px; }
.form-label { display: block; font-size: 12px; color: var(--text-dim); margin-bottom: 4px; }
.form-input { width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; outline: none; }
.form-input:focus { border-color: var(--pink); }
.form-hint { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
.form-actions { display: flex; gap: 8px; }
.btn-create { padding: 10px 20px; background: var(--pink); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-cancel { padding: 10px 20px; background: transparent; border: 1px solid var(--border); color: var(--text-dim); border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-new-test { padding: 10px 20px; background: transparent; border: 1px solid var(--pink); color: var(--pink); border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 8px; }
.btn-new-test:hover { background: rgba(254,44,85,0.1); }

/* Test templates */
.tpl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.2s; }
.tpl-card:hover { border-color: var(--pink); }
.tpl-card.disabled { opacity: 0.4; cursor: default; pointer-events: none; }
.tpl-title { font-size: 15px; font-weight: 600; color: var(--text-bright); margin-bottom: 4px; }
.tpl-desc { font-size: 13px; color: var(--text-dim); line-height: 1.4; margin-bottom: 6px; }
.tpl-variants { font-size: 12px; color: var(--cyan); }
.tpl-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 8px; font-weight: 600; text-transform: uppercase; }
.tpl-badge.active { background: rgba(0,248,145,0.15); color: var(--green); }
.tpl-badge.available { background: rgba(254,44,85,0.15); color: var(--pink); }

/* Top performers */
.perf-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.perf-row:last-child { border-bottom: none; }
.perf-rank { font-size: 13px; color: var(--text-dim); width: 24px; }
.perf-name { font-size: 14px; color: var(--cyan); flex: 1; }
.perf-clicks { font-size: 14px; font-weight: 600; color: var(--text-bright); font-variant-numeric: tabular-nums; }

/* Conversions */
.conv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
.conv-card { text-align: center; padding: 12px; background: var(--bg); border-radius: 8px; }
.conv-type { font-size: 12px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 4px; }
.conv-count { font-size: 20px; font-weight: 700; color: var(--text-bright); }
.conv-amount { font-size: 13px; color: var(--green); }

/* Recommendations */
.ab-recommendation { margin-top: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
.ab-recommendation strong { display: block; margin-bottom: 2px; }
.ab-recommendation.waiting { background: rgba(136,136,136,0.1); color: var(--text-dim); border-left: 3px solid var(--text-dim); }
.ab-recommendation.uncertain { background: rgba(255,215,64,0.08); color: var(--gold); border-left: 3px solid var(--gold); }
.ab-recommendation.winner-control { background: rgba(0,240,255,0.08); color: var(--cyan); border-left: 3px solid var(--cyan); }
.ab-recommendation.winner-variant { background: rgba(0,248,145,0.1); color: var(--green); border-left: 3px solid var(--green); }

/* Loading */
.loading { text-align: center; padding: 40px; color: var(--text-dim); }
.empty { text-align: center; padding: 20px; color: var(--text-dim); font-size: 13px; }

/* Refresh indicator */
.refresh-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 6px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
</style>
</head>
<body>

<?php if (!$loggedIn): ?>
<!-- LOGIN -->
<div class="login-wrap">
  <div class="login-card">
    <h1>SwipeHot</h1>
    <p>Admin Dashboard</p>
    <div class="login-error" id="loginError"></div>
    <form id="loginForm" onsubmit="return doLogin(event)">
      <input type="password" id="loginPass" placeholder="Password" autofocus>
      <button type="submit">Sign In</button>
    </form>
  </div>
</div>
<script>
async function doLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  try {
    const r = await fetch('/api/admin.php?action=login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({password: pw})
    });
    const d = await r.json();
    if (d.ok) { location.reload(); }
    else { errEl.textContent = d.error || 'Wrong password'; errEl.style.display = 'block'; }
  } catch { errEl.textContent = 'Connection error'; errEl.style.display = 'block'; }
  return false;
}
</script>

<?php else: ?>
<!-- DASHBOARD -->
<div class="dash">
  <div class="header">
    <h1><span class="refresh-dot"></span>SwipeHot Admin</h1>
    <div class="header-right">
      <div class="period-pills">
        <button class="pill" data-p="today">Today</button>
        <button class="pill active" data-p="24h">24h</button>
        <button class="pill" data-p="7d">7d</button>
        <button class="pill" data-p="30d">30d</button>
      </div>
      <button class="btn-logout" onclick="doLogout()">Logout</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="kpi-grid" id="kpiGrid">
    <div class="kpi-card"><div class="kpi-label">Visitors</div><div class="kpi-value" id="kpiVisitors">-</div><div class="kpi-delta" id="kpiVisitorsDelta"></div></div>
    <div class="kpi-card"><div class="kpi-label">Sessions</div><div class="kpi-value" id="kpiSessions">-</div><div class="kpi-delta" id="kpiSessionsDelta"></div></div>
    <div class="kpi-card"><div class="kpi-label">CTA Clicks</div><div class="kpi-value" id="kpiCta">-</div><div class="kpi-delta" id="kpiCtaDelta"></div></div>
    <div class="kpi-card"><div class="kpi-label">CTR</div><div class="kpi-value" id="kpiCtr">-</div><div class="kpi-delta" id="kpiCtrDelta"></div></div>
  </div>

  <!-- Funnel -->
  <div class="section">
    <div class="section-title">Funnel</div>
    <div id="funnelContent"><div class="loading">Loading...</div></div>
  </div>

  <!-- Devices + Depth -->
  <div class="two-col">
    <div class="section">
      <div class="section-title">Devices</div>
      <div id="devicesContent"><div class="loading">Loading...</div></div>
    </div>
    <div class="section">
      <div class="section-title">Session Depth</div>
      <div id="depthContent"><div class="loading">Loading...</div></div>
    </div>
  </div>

  <!-- A/B Tests -->
  <div class="section">
    <div class="section-title">A/B Tests</div>
    <div id="abContent"><div class="loading">Loading...</div></div>
    <button class="btn-new-test" id="btnNewTest" onclick="toggleNewForm()">+ New A/B Test</button>
    <div class="new-test-form" id="newTestForm">
      <div class="form-label" style="margin-bottom:12px;font-size:14px;color:var(--text-bright)">Pick a test to run:</div>
      <div id="templateList"></div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
        <details>
          <summary style="font-size:12px;color:var(--text-dim);cursor:pointer">Advanced: Custom test (requires code changes)</summary>
          <div style="margin-top:12px">
            <div class="form-row">
              <label class="form-label">Test Name</label>
              <input class="form-input" id="newName" placeholder="e.g. cta_color">
            </div>
            <div class="form-row">
              <label class="form-label">Variants (comma-separated)</label>
              <input class="form-input" id="newVariants" placeholder="e.g. control, red, green">
            </div>
            <div class="form-row">
              <label class="form-label">Traffic %</label>
              <input class="form-input" id="newTraffic" type="number" value="100" min="0" max="100">
            </div>
            <div class="form-actions">
              <button class="btn-create" onclick="createTest()">Create Test</button>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>

  <!-- Top Performers -->
  <div class="section">
    <div class="section-title">Top Performers (by CTA clicks)</div>
    <div id="perfContent"><div class="loading">Loading...</div></div>
  </div>

  <!-- Conversions -->
  <div class="section">
    <div class="section-title">Conversions (30 days)</div>
    <div id="convContent"><div class="loading">Loading...</div></div>
  </div>
</div>

<script>
const API = '/api/admin.php';
let period = '24h';

// --- Helpers ---
function fmt(n) { return n == null ? '-' : n.toLocaleString(); }
function pct(n) { return n == null ? '-' : n + '%'; }

function delta(cur, prev) {
  if (!prev || prev === 0) return { text: '', cls: 'flat' };
  const d = ((cur - prev) / prev * 100);
  if (Math.abs(d) < 0.5) return { text: '0%', cls: 'flat' };
  const sign = d > 0 ? '+' : '';
  return { text: sign + d.toFixed(0) + '% vs prev', cls: d > 0 ? 'up' : 'down' };
}

async function api(action, params = {}, method = 'GET', body = null) {
  const url = new URL(API, location.origin);
  url.searchParams.set('action', action);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k, v);
  const opts = { method };
  if (body) { opts.headers = {'Content-Type':'application/json'}; opts.body = JSON.stringify(body); }
  const r = await fetch(url, opts);
  if (r.status === 401) { location.reload(); return null; }
  return r.json();
}

// --- Load all sections ---
async function loadAll() {
  loadOverview();
  loadFunnel();
  loadDevices();
  loadDepth();
  loadABTests();
  loadPerformers();
  loadConversions();
}

async function loadOverview() {
  const d = await api('overview', {period});
  if (!d) return;
  document.getElementById('kpiVisitors').textContent = fmt(d.visitors);
  document.getElementById('kpiSessions').textContent = fmt(d.sessions);
  document.getElementById('kpiCta').textContent = fmt(d.cta_clicks);
  document.getElementById('kpiCtr').textContent = pct(d.ctr);

  const dv = delta(d.visitors, d.prev.visitors);
  const ds = delta(d.sessions, d.prev.sessions);
  const dc = delta(d.cta_clicks, d.prev.cta_clicks);
  const dr = delta(d.ctr, d.prev.ctr);

  setDelta('kpiVisitorsDelta', dv);
  setDelta('kpiSessionsDelta', ds);
  setDelta('kpiCtaDelta', dc);
  setDelta('kpiCtrDelta', dr);
}

function setDelta(id, d) {
  const el = document.getElementById(id);
  el.textContent = d.text;
  el.className = 'kpi-delta ' + d.cls;
}

async function loadFunnel() {
  const d = await api('funnel', {period});
  if (!d) return;
  const maxVal = Math.max(...d.steps.map(s => s.value), 1);
  let html = '';
  d.steps.forEach((s, i) => {
    const w = Math.max(2, s.value / maxVal * 100);
    const rate = i > 0 && s.rate != null ? ` <span class="funnel-rate">(${s.rate}%)</span>` : '';
    html += `<div class="funnel-step">
      <div class="funnel-label">${s.label}</div>
      <div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${w}%"></div></div>
      <div class="funnel-value">${fmt(s.value)}${rate}</div>
    </div>`;
  });
  document.getElementById('funnelContent').innerHTML = html || '<div class="empty">No data yet</div>';
}

async function loadDevices() {
  const d = await api('devices', {period});
  if (!d) return;
  const total = Object.values(d).reduce((a,b) => a+b, 0) || 1;
  let html = '';
  for (const [name, count] of Object.entries(d).sort((a,b) => b[1] - a[1])) {
    const p = (count / total * 100).toFixed(0);
    html += `<div class="device-row">
      <div class="device-name">${name}</div>
      <div class="device-bar-wrap"><div class="device-bar" style="width:${p}%"></div></div>
      <div class="device-pct">${p}%</div>
    </div>`;
  }
  document.getElementById('devicesContent').innerHTML = html || '<div class="empty">No data</div>';
}

async function loadDepth() {
  const d = await api('session_depth', {period});
  if (!d || !d.length) { document.getElementById('depthContent').innerHTML = '<div class="empty">No data</div>'; return; }
  const maxVal = Math.max(...d.map(r => r.count), 1);
  let html = '';
  d.forEach(r => {
    const w = Math.max(2, r.count / maxVal * 100);
    html += `<div class="depth-row">
      <div class="depth-label">${r.bucket}</div>
      <div class="depth-bar-wrap"><div class="depth-bar" style="width:${w}%"></div></div>
      <div class="depth-count">${fmt(r.count)}</div>
    </div>`;
  });
  document.getElementById('depthContent').innerHTML = html;
}

// Human-readable test descriptions
const TEST_DESCRIPTIONS = {
  start_screen: {desc: 'Show splash screen or go straight to roulette after age gate', metric: 'CTA click rate'},
  cta_copy: {desc: 'Which button text gets more clicks', metric: 'CTA click rate'},
  cta_delay: {desc: 'How long before showing the CTA button', metric: 'CTA click rate'},
  gender_default: {desc: 'Start on All genders or Female only', metric: 'session depth & CTA clicks'},
  overlay_timeout: {desc: 'How quickly the UI fades out over the video', metric: 'engagement & CTA clicks'},
  swipe_hint: {desc: 'Show "Swipe up for next" hint or not', metric: 'bounce rate & session depth'},
};

// Available test templates (all are pre-coded in the frontend)
const TEST_TEMPLATES = [
  {
    name: 'start_screen',
    title: 'Start Screen',
    question: 'Should visitors see a splash screen, or jump straight into the roulette?',
    variants: ['control', 'instant'],
    explain: 'control = show "Start" button first, instant = skip straight to streams',
  },
  {
    name: 'cta_copy',
    title: 'CTA Button Text',
    question: 'Which button text makes more people click to visit the model?',
    variants: ['watch_live', 'go_live', 'chat_now'],
    explain: 'watch_live = "Watch Her Live", go_live = "Go Live", chat_now = "Chat Now"',
  },
  {
    name: 'cta_delay',
    title: 'CTA Timing',
    question: 'Should the CTA button appear early, normal, or late?',
    variants: ['fast', 'normal', 'slow'],
    explain: 'fast = shows at 15s, normal = 30s, slow = 60s',
  },
  {
    name: 'gender_default',
    title: 'Default Gender Filter',
    question: 'Should new visitors start with "All" genders or "Female" only?',
    variants: ['all', 'female'],
    explain: 'all = show all genders by default, female = start filtered to women only',
  },
  {
    name: 'overlay_timeout',
    title: 'Overlay Fade Speed',
    question: 'How fast should the UI overlay fade out over the video?',
    variants: ['fast', 'normal', 'slow'],
    explain: 'fast = 3 seconds, normal = 5 seconds, slow = 8 seconds',
  },
  {
    name: 'swipe_hint',
    title: 'Swipe Hint',
    question: 'Show a "swipe up for next" hint on mobile, or hide it?',
    variants: ['visible', 'hidden'],
    explain: 'visible = show hint arrow, hidden = no hint (cleaner look)',
  },
];

let existingTestNames = [];

function renderTemplates() {
  const el = document.getElementById('templateList');
  if (!el) return;
  let html = '';
  for (const tpl of TEST_TEMPLATES) {
    const exists = existingTestNames.includes(tpl.name);
    html += `<div class="tpl-card ${exists ? 'disabled' : ''}" onclick="${exists ? '' : `createFromTemplate('${tpl.name}')`}">
      <div class="tpl-title">${tpl.title}${exists
        ? '<span class="tpl-badge active">Already exists</span>'
        : '<span class="tpl-badge available">Available</span>'}</div>
      <div class="tpl-desc">${tpl.question}</div>
      <div class="tpl-variants">${tpl.explain}</div>
    </div>`;
  }
  el.innerHTML = html;
}

async function createFromTemplate(name) {
  const tpl = TEST_TEMPLATES.find(t => t.name === name);
  if (!tpl) return;
  if (!confirm(`Start test: "${tpl.title}"?\n\n${tpl.question}\n\nVariants: ${tpl.variants.join(' vs ')}`)) return;

  const res = await api('ab_create', {}, 'POST', {
    test_name: tpl.name,
    variants: tpl.variants,
    traffic_pct: 100,
  });
  if (res && res.ok) {
    // Auto-start it
    await api('ab_start', {}, 'POST', {id: res.id});
    toggleNewForm();
    loadABTests();
  } else {
    alert(res?.error || 'Failed to create test');
  }
}

function getRecommendation(res) {
  if (!res || !res.results) return '';
  const total = res.total_sessions || 0;

  // Not enough data
  if (total < 30) {
    return `<div class="ab-recommendation waiting">
      <strong>Collecting data...</strong> Only ${total} sessions so far. Need at least 100 for any conclusions. Keep running.
    </div>`;
  }
  if (total < 100) {
    return `<div class="ab-recommendation waiting">
      <strong>Too early to call.</strong> ${total} sessions collected. Need ~${Math.max(100, total * 3)} for a reliable result. Keep running.
    </div>`;
  }

  // Find the best variant
  const variants = res.variants || [];
  const control = variants[0];
  let bestV = control, bestRate = res.results[control]?.rate || 0;
  for (const v of variants) {
    const rate = res.results[v]?.rate || 0;
    if (rate > bestRate) { bestRate = rate; bestV = v; }
  }

  // Check significance
  const hasSig = Object.values(res.significance || {}).some(s => s.is_significant);

  if (!hasSig) {
    const rates = variants.map(v => `${v}: ${res.results[v]?.rate || 0}%`).join(', ');
    return `<div class="ab-recommendation uncertain">
      <strong>No clear winner yet.</strong> Results are too close to be sure (${rates}). Keep running to collect more data, or stop the test if the difference doesn't matter to you.
    </div>`;
  }

  // We have a significant winner
  if (bestV === control) {
    const sig = Object.values(res.significance || {})[0];
    return `<div class="ab-recommendation winner-control">
      <strong>Keep the current setup ("${control}").</strong> It's performing the same or better than the alternatives. You can stop this test and save the data.
    </div>`;
  } else {
    const sig = res.significance[bestV];
    const liftSign = sig && sig.lift > 0 ? '+' : '';
    const liftText = sig ? `${liftSign}${sig.lift}%` : '';
    const confText = sig ? `${sig.confidence}%` : '';
    return `<div class="ab-recommendation winner-variant">
      <strong>Switch to "${bestV}"!</strong> It's getting ${liftText} more conversions than "${control}" (${confText} confident). You can complete this test and make "${bestV}" the default.
    </div>`;
  }
}

async function loadABTests() {
  const tests = await api('ab_list');
  existingTestNames = (tests || []).map(t => t.test_name);
  renderTemplates();
  if (!tests || !tests.length) {
    document.getElementById('abContent').innerHTML = '<div class="empty">No A/B tests yet. Pick one below to start.</div>';
    return;
  }

  let html = '';
  for (const t of tests) {
    const info = TEST_DESCRIPTIONS[t.test_name] || {};
    let resultsHtml = '';
    let recommendationHtml = '';

    if (t.status !== 'draft') {
      const res = await api('ab_results', {id: t.id});
      if (res && res.results) {
        const variants = res.variants || [];

        // Variant bars
        const maxRate = Math.max(...variants.map(v => res.results[v]?.rate || 0), 0.1);
        for (const v of variants) {
          const vd = res.results[v];
          if (!vd) continue;
          const isWinner = v === res.winner && res.enough_data;
          const barW = Math.max(5, vd.rate / maxRate * 100);
          resultsHtml += `<div class="ab-variant-row ${isWinner ? 'winner' : ''}">
            <div class="ab-variant-name">${v}</div>
            <div class="ab-variant-bar" style="width:${barW}%;background:${isWinner ? 'var(--green)' : 'var(--border)'};height:4px;border-radius:2px;margin:4px 0"></div>
            <div class="ab-variant-rate">${vd.rate}%</div>
            <div class="ab-variant-sessions">${fmt(vd.sessions)} sessions</div>
            ${isWinner ? '<div class="ab-variant-badge">LEADING</div>' : ''}
          </div>`;
        }

        // Plain-English recommendation
        recommendationHtml = getRecommendation(res);

        // Technical details (collapsed)
        let techHtml = '';
        const controlV = variants[0];
        for (let i = 1; i < variants.length; i++) {
          const sig = res.significance[variants[i]];
          if (sig) {
            const liftSign = sig.lift > 0 ? '+' : '';
            techHtml += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px">
              ${variants[i]} vs ${controlV}: ${liftSign}${sig.lift}% lift, p=${sig.p_value}, ${sig.confidence}% confidence
            </div>`;
          }
        }
        if (techHtml) {
          resultsHtml += `<details style="margin-top:8px"><summary style="font-size:11px;color:var(--text-dim);cursor:pointer">Technical details</summary>${techHtml}</details>`;
        }
      }
    }

    // Action buttons
    let actionsHtml = '';
    if (t.status === 'draft') {
      actionsHtml = `<button class="ab-btn start" onclick="abAction('ab_start',${t.id})">Start Test</button>
        <button class="ab-btn delete" onclick="abAction('ab_delete',${t.id})">Delete</button>`;
    } else if (t.status === 'running') {
      actionsHtml = `<button class="ab-btn pause" onclick="abAction('ab_pause',${t.id})">Pause</button>
        <button class="ab-btn complete" onclick="abAction('ab_complete',${t.id})">Complete &amp; Apply Winner</button>`;
    } else if (t.status === 'paused') {
      actionsHtml = `<button class="ab-btn start" onclick="abAction('ab_start',${t.id})">Resume</button>
        <button class="ab-btn complete" onclick="abAction('ab_complete',${t.id})">Complete</button>
        <button class="ab-btn delete" onclick="abAction('ab_delete',${t.id})">Delete</button>`;
    } else if (t.status === 'completed') {
      actionsHtml = `<button class="ab-btn delete" onclick="abAction('ab_delete',${t.id})">Delete</button>`;
    }

    const descHtml = info.desc ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">${info.desc}${info.metric ? ' &middot; Measuring: <strong>' + info.metric + '</strong>' : ''}</div>` : '';

    html += `<div class="ab-card">
      <div class="ab-header">
        <div class="ab-name">${t.test_name.replace(/_/g, ' ')}</div>
        <span class="ab-status ${t.status}">${t.status}</span>
      </div>
      ${descHtml}
      <div class="ab-variants-label">${(t.variants || []).join(' vs ')}</div>
      ${resultsHtml}
      ${recommendationHtml}
      <div class="ab-actions">${actionsHtml}</div>
    </div>`;
  }

  document.getElementById('abContent').innerHTML = html;
}

async function abAction(action, id) {
  if (action === 'ab_delete' && !confirm('Delete this test?')) return;
  await api(action, {}, 'POST', {id});
  loadABTests();
}

function toggleNewForm() {
  const form = document.getElementById('newTestForm');
  form.classList.toggle('visible');
}

async function createTest() {
  const name = document.getElementById('newName').value.trim();
  const variantsRaw = document.getElementById('newVariants').value.trim();
  const traffic = parseInt(document.getElementById('newTraffic').value) || 100;

  if (!name || !variantsRaw) { alert('Fill in test name and variants'); return; }

  const variants = variantsRaw.split(',').map(v => v.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')).filter(Boolean);
  if (variants.length < 2) { alert('Need at least 2 variants (comma-separated)'); return; }

  const res = await api('ab_create', {}, 'POST', { test_name: name, variants, traffic_pct: traffic });
  if (res && res.ok) {
    document.getElementById('newName').value = '';
    document.getElementById('newVariants').value = '';
    document.getElementById('newTraffic').value = '100';
    toggleNewForm();
    loadABTests();
  } else {
    alert(res?.error || 'Failed to create test');
  }
}

async function loadPerformers() {
  const d = await api('top_performers', {period});
  if (!d || !d.length) { document.getElementById('perfContent').innerHTML = '<div class="empty">No CTA clicks in this period</div>'; return; }
  let html = '';
  d.forEach((p, i) => {
    html += `<div class="perf-row">
      <div class="perf-rank">${i+1}.</div>
      <div class="perf-name">${p.performer}</div>
      <div class="perf-clicks">${p.clicks} clicks</div>
    </div>`;
  });
  document.getElementById('perfContent').innerHTML = html;
}

async function loadConversions() {
  const d = await api('conversions');
  if (!d || !d.length) { document.getElementById('convContent').innerHTML = '<div class="empty">No conversions yet (postback URL not configured or no conversions received)</div>'; return; }
  let html = '<div class="conv-grid">';
  let totalCommission = 0;
  d.forEach(c => {
    totalCommission += c.commission;
    html += `<div class="conv-card">
      <div class="conv-type">${c.type}</div>
      <div class="conv-count">${fmt(c.count)}</div>
      <div class="conv-amount">$${c.commission.toFixed(2)}</div>
    </div>`;
  });
  html += `<div class="conv-card">
    <div class="conv-type">Total</div>
    <div class="conv-count">&nbsp;</div>
    <div class="conv-amount" style="font-size:16px;font-weight:700">$${totalCommission.toFixed(2)}</div>
  </div>`;
  html += '</div>';
  document.getElementById('convContent').innerHTML = html;
}

// --- Period switching ---
document.querySelectorAll('.pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    period = btn.dataset.p;
    loadAll();
  });
});

// --- Logout ---
async function doLogout() {
  await api('logout', {}, 'POST');
  location.reload();
}

// --- Init ---
loadAll();
// Auto-refresh every 60s
setInterval(loadAll, 60000);
</script>

<?php endif; ?>
</body>
</html>
