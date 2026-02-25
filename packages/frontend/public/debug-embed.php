<?php
/**
 * Debug page — shows raw API response + embed iframe test.
 * Upload to web root, visit in browser, then DELETE.
 */
require_once __DIR__ . '/api/_config.php';
require_once __DIR__ . '/api/_pool.php';

// Override JSON content type for HTML page
header('Content-Type: text/html; charset=utf-8');

$sessionId = bin2hex(random_bytes(16));
$gender = $_GET['gender'] ?? 'f';

// Get pool
$pool = getPool($gender);
$performer = null;
$embedUrl = '';
$error = '';

if (empty($pool)) {
    $error = 'Pool is EMPTY — CB API returned no data.';
} else {
    // Pick first performer (simplest test)
    $performer = $pool[0];
    $embedUrl = buildEmbedUrl($performer, $sessionId);
}

// Build some alternative embed URLs for comparison
$altUrls = [];
if ($performer) {
    $user = $performer['username'];
    // Format 1: Our generated URL (with all params)
    $altUrls['our_url'] = $embedUrl;
    // Format 2: Minimal chaturbate.com embed
    $altUrls['cb_minimal'] = "https://chaturbate.com/embed/{$user}/?tour=" . AFFILIATE_TOUR . "&campaign=" . AFFILIATE_CAMPAIGN . "&disable_sound=1";
    // Format 3: Minimal whitelabel embed
    $altUrls['wl_minimal'] = "https://" . WHITELABEL_DOMAIN . "/embed/{$user}/?tour=" . AFFILIATE_TOUR . "&campaign=" . AFFILIATE_CAMPAIGN . "&disable_sound=1";
    // Format 4: CB embed no params at all
    $altUrls['cb_bare'] = "https://chaturbate.com/embed/{$user}/";
    // Format 5: From the API's iframe_embed field (parsed src)
    $iframeHtml = $performer['iframe_embed'] ?? '';
    if (preg_match('/src=["\']([^"\']+)/', $iframeHtml, $m)) {
        $altUrls['api_native'] = $m[1];
    }
}
?>
<!DOCTYPE html>
<html>
<head>
<title>SwipeHot Embed Debug</title>
<style>
body { margin:0; background:#0a0a0a; color:#ddd; font-family:system-ui,sans-serif; padding:20px; max-width:900px; margin:0 auto }
h2 { color:#e94f8a; margin:0 0 15px }
.section { background:#151515; border:1px solid #333; border-radius:8px; padding:16px; margin-bottom:20px }
.section h3 { color:#e94f8a; margin:0 0 8px; font-size:15px }
pre { background:#0f0f0f; padding:10px; border-radius:4px; overflow-x:auto; font-size:12px; color:#999; white-space:pre-wrap; word-break:break-all }
.url { font-size:11px; color:#666; word-break:break-all; font-family:monospace; margin-bottom:8px }
iframe { width:100%; aspect-ratio:16/9; border:none; background:#000; border-radius:4px }
.status { font-size:12px; padding:4px 8px; border-radius:4px; display:inline-block; margin-bottom:8px }
.ok { background:#1a3a1a; color:#4f4 }
.err { background:#3a1a1a; color:#f44 }
.warn { background:#3a3a1a; color:#ff4 }
table { width:100%; border-collapse:collapse; font-size:13px }
td { padding:6px 8px; border-bottom:1px solid #222 }
td:first-child { color:#888; width:200px }
</style>
</head>
<body>
<h2>SwipeHot Embed Debug</h2>

<!-- 1. Config check -->
<div class="section">
<h3>1. Server Config</h3>
<table>
<tr><td>WHITELABEL_DOMAIN</td><td><?= htmlspecialchars(WHITELABEL_DOMAIN) ?></td></tr>
<tr><td>AFFILIATE_CAMPAIGN</td><td><?= htmlspecialchars(AFFILIATE_CAMPAIGN) ?></td></tr>
<tr><td>AFFILIATE_TOUR</td><td><?= htmlspecialchars(AFFILIATE_TOUR) ?></td></tr>
<tr><td>AFFILIATE_TRACK</td><td><?= htmlspecialchars(AFFILIATE_TRACK) ?></td></tr>
<tr><td>CACHE_DIR</td><td><?= htmlspecialchars(CACHE_DIR) ?> <?= is_writable(CACHE_DIR) ? '<span class="status ok">writable</span>' : '<span class="status err">NOT writable</span>' ?></td></tr>
<tr><td>Pool size (<?= $gender ?>)</td><td><?= count($pool) ?> performers</td></tr>
<tr><td>PHP version</td><td><?= PHP_VERSION ?></td></tr>
<tr><td>HTTPS</td><td><?= (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? '<span class="status ok">Yes</span>' : '<span class="status err">No — embeds may fail without SSL!</span>' ?></td></tr>
<tr><td>Server headers</td><td><span id="headers-check">checking...</span></td></tr>
</table>
</div>

<?php if ($error): ?>
<div class="section">
<h3>ERROR</h3>
<p class="status err"><?= htmlspecialchars($error) ?></p>
</div>
<?php else: ?>

<!-- 2. Raw performer data -->
<div class="section">
<h3>2. Performer: <?= htmlspecialchars($performer['username']) ?> (<?= $performer['num_users'] ?> viewers)</h3>
<table>
<tr><td>Username</td><td><?= htmlspecialchars($performer['username']) ?></td></tr>
<tr><td>Gender</td><td><?= $performer['gender'] ?></td></tr>
<tr><td>image_url</td><td><img src="<?= htmlspecialchars($performer['image_url']) ?>" style="height:60px;border-radius:4px"> <?= htmlspecialchars($performer['image_url']) ?></td></tr>
<tr><td>iframe_embed (from CB API)</td><td class="url"><?= htmlspecialchars($performer['iframe_embed'] ?? 'empty') ?></td></tr>
<tr><td>Our embed_url</td><td class="url"><?= htmlspecialchars($embedUrl) ?></td></tr>
</table>
</div>

<!-- 3. Embed tests -->
<?php foreach ($altUrls as $label => $url): ?>
<div class="section">
<h3>Embed: <?= htmlspecialchars($label) ?></h3>
<div class="url"><?= htmlspecialchars($url) ?></div>
<div class="status" id="st-<?= $label ?>">loading...</div>
<iframe id="fr-<?= $label ?>" src="about:blank"
  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
  scrolling="no"></iframe>
</div>
<?php endforeach; ?>

<script>
// Load iframes one by one with delay
const tests = <?= json_encode($altUrls) ?>;
const keys = Object.keys(tests);
let i = 0;
function loadNext() {
  if (i >= keys.length) return;
  const key = keys[i++];
  const fr = document.getElementById('fr-' + key);
  const st = document.getElementById('st-' + key);
  fr.src = tests[key];
  fr.onload = () => { st.textContent = 'iframe loaded (check if video plays)'; st.className = 'status ok'; };
  fr.onerror = () => { st.textContent = 'LOAD ERROR'; st.className = 'status err'; };
  setTimeout(loadNext, 500);
}
loadNext();

// Check response headers for CSP
fetch(window.location.href, {method: 'HEAD'}).then(r => {
  const csp = r.headers.get('content-security-policy') || 'none';
  const xfo = r.headers.get('x-frame-options') || 'none';
  document.getElementById('headers-check').innerHTML =
    'CSP: ' + csp + '<br>X-Frame-Options: ' + xfo;
  if (csp !== 'none' && csp.includes('frame-src')) {
    document.getElementById('headers-check').innerHTML += '<br><span class="status err">CSP frame-src may block embeds!</span>';
  }
});
</script>

<?php endif; ?>

<div class="section" style="margin-top:30px; background:#1a1a0a; border-color:#553">
<h3 style="color:#ff4">After testing, DELETE this file from the server!</h3>
<p style="color:#888;font-size:13px">This page exposes config details. Remove it when done.</p>
</div>

</body>
</html>
