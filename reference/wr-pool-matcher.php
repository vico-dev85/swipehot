<?php
/**
 * Plugin Name: WR Pool Matcher (Multi-Pool, Per-Gender Fetch)
 * Description: Builds fast, per-gender caches from Chaturbate (general/female/male/trans/couple) and serves /next.
 * Version:     2.0.0
 * Author:      Wetroulette
 */

if (!defined('ABSPATH')) exit;

/* =======================
 *   CONFIG / CONSTANTS
 * ======================= */

const WR_PM_CAMPAIGN     = 'roGHG';
const WR_PM_TOUR         = '9oGW';
const WR_PM_TRACK        = 'wetroulette';

const WR_PM_CACHE_TTL    = 60;    // seconds for the transient caches
const WR_PM_KEY_PREFIX   = 'wr_pool_v2_'; // transient key prefix
const WR_PM_POOLS        = ['general','female','male','trans','couple'];

// Optional forced tag. Leave '' to disable.
// If you set 'nonude' here, expect smaller pools.
const WR_PM_FORCED_TAG   = '';

// Target sizes per pool (tune freely).
const WR_PM_TARGETS = [
  'general' => 400,
  'female'  => 240,
  'male'    => 160,
  'trans'   => 140,
  'couple'  => 160,
];

// Fetch strategy knobs
const WR_PM_PER_CALL_LIMIT = 500; // 1..500 per API call
const WR_PM_MAX_ATTEMPTS   = 4;   // how many times to try with different offsets

/* =======================
 *   HELPERS
 * ======================= */

// Build your final embed src from a username.
function wr_pm_embed_src($username){
  $u = rawurlencode($username);
  return "https://www.xcam.vip/embed/{$u}/?campaign=" . rawurlencode(WR_PM_CAMPAIGN)
       . "&disable_sound=0&embed_video_only=1&join_overlay=1&mobileRedirect=auto"
       . "&room={$u}&tour=" . rawurlencode(WR_PM_TOUR)
       . "&track=" . rawurlencode(WR_PM_TRACK);
}

/** Transient helpers */
function wr_pm_set_pool_multi(array $payloadByPool){
  foreach ($payloadByPool as $pool => $rows) {
    set_transient(
      WR_PM_KEY_PREFIX.$pool,
      ['fetched_at'=>time(),'results'=>array_values($rows)],
      WR_PM_CACHE_TTL + 15
    );
  }
}
function wr_pm_get_pool_multi($pool){
  $cache = get_transient(WR_PM_KEY_PREFIX.$pool);
  if (!empty($cache['results'])) return $cache;
  return ['fetched_at'=>0,'results'=>[]];
}

/** Build base params for CB API (opt gender / tag) */
function wr_pm_base_params(int $limit, ?string $genderLetter = null): array {
  $p = [
    'wm'        => WR_PM_CAMPAIGN,
    'client_ip' => 'request_ip',
    'format'    => 'json',
    'limit'     => max(1, min(500, $limit)),
  ];
  if ($genderLetter) {
    $gl = strtolower($genderLetter);
    if (in_array($gl, ['f','m','t','c'], true)) $p['gender'] = $gl;
  }
  if (defined('WR_PM_FORCED_TAG') && WR_PM_FORCED_TAG !== '') {
    $p['tag'] = WR_PM_FORCED_TAG;
  }
  return $p;
}

/** Single pull from CB (optional offset); keep only PUBLIC rooms w/ username */
function wr_pm_fetch_once(array $params, int $offset = 0): array {
  if ($offset > 0) $params['offset'] = $offset;
  $url = 'https://chaturbate.com/api/public/affiliates/onlinerooms/?' . http_build_query($params, '', '&');

  $res = wp_remote_get($url, [
    'timeout' => 8,
    'headers' => ['Accept'=>'application/json','User-Agent'=>'WR-Pool-Matcher/2.0'],
    // If your server has SSL CA issues, TEMPORARILY add:
    // 'sslverify' => false,
  ]);
  if (is_wp_error($res)) return [];

  $code = wp_remote_retrieve_response_code($res);
  $body = wp_remote_retrieve_body($res);
  if ($code !== 200 || !$body) return [];

  $json  = json_decode($body, true);
  $rooms = is_array($json) ? ($json['results'] ?? []) : [];
  // Keep only public + username
  $rooms = array_values(array_filter($rooms, function($r){
    return ($r['current_show'] ?? '') === 'public' && !empty($r['username']);
  }));

  return $rooms;
}

/** Fill a pool by gender letter (null = general) with retries + randomized offsets */
function wr_pm_fill_gender_pool(?string $genderLetter, int $target, int $perCallLimit = WR_PM_PER_CALL_LIMIT, int $maxAttempts = WR_PM_MAX_ATTEMPTS): array {
  $params = wr_pm_base_params($perCallLimit, $genderLetter);
  $seen   = [];
  $out    = [];

  for ($i = 0; $i < $maxAttempts && count($out) < $target; $i++) {
    // First pass offset 0, then wander to reduce repetition
    $offset = ($i === 0) ? 0 : rand(50, 2500);
    $batch  = wr_pm_fetch_once($params, $offset);
    if (empty($batch)) continue;

    foreach ($batch as $r) {
      $u = strtolower($r['username'] ?? '');
      if ($u === '' || isset($seen[$u])) continue;
      $seen[$u] = true;

      if ($genderLetter) {
        // enforce correct gender if upstream is noisy
        $want = strtolower($genderLetter);
        if (strtolower($r['gender'] ?? '') !== $want) continue;
      }
      $out[] = $r;
      if (count($out) >= $target) break;
    }
  }

  // Randomize and cap
  if (!empty($out)) {
    shuffle($out);
    $out = array_slice($out, 0, $target);
  }
  return $out;
}

/** Fetch each pool separately to guarantee decent counts + top-up from general if needed */
function wr_pm_fetch_and_split(): array {
  $targets = WR_PM_TARGETS;

  // Build shards: one upstream pull per pool
  $shards = [
    'general' => wr_pm_fill_gender_pool(null, $targets['general']),
    'female'  => wr_pm_fill_gender_pool('f',  $targets['female']),
    'male'    => wr_pm_fill_gender_pool('m',  $targets['male']),
    'trans'   => wr_pm_fill_gender_pool('t',  $targets['trans']),
    'couple'  => wr_pm_fill_gender_pool('c',  $targets['couple']),
  ];

  // Safety net: if a shard underfills, top up from general (same gender only)
  $gLetter = ['female'=>'f','male'=>'m','trans'=>'t','couple'=>'c'];
  foreach (['female','male','trans','couple'] as $pool) {
    $have = count($shards[$pool]);
    if ($have >= $targets[$pool]) continue;

    $need = $targets[$pool] - $have;
    $want = $gLetter[$pool];

    $generalSame = array_values(array_filter($shards['general'], function($r) use ($want){
      return strtolower($r['gender'] ?? '') === $want;
    }));

    if (!$generalSame) continue;

    // Dedup by username when merging
    $seen = [];
    foreach ($shards[$pool] as $r) { $seen[strtolower($r['username'])] = true; }

    $added = 0;
    foreach ($generalSame as $r) {
      $u = strtolower($r['username'] ?? '');
      if ($u === '' || isset($seen[$u])) continue;
      $shards[$pool][] = $r; $seen[$u] = true; $added++;
      if ($added >= $need) break;
    }
  }

  // Final shuffle & reasonable caps (avoid huge memory)
  foreach ($shards as $k => $arr) {
    if (!empty($arr)) {
      shuffle($arr);
      $cap = max(100, $targets[$k]); // at least 100 or target
      $shards[$k] = array_slice($arr, 0, $cap);
    }
  }
  return $shards;
}

/* =======================
 *   CRON: REFRESH CACHES
 * ======================= */

add_filter('cron_schedules', function($s){
  if (!isset($s['wr_every_minute'])){
    $s['wr_every_minute'] = ['interval'=>60, 'display'=>'Every Minute (WR)'];
  }
  return $s;
});

add_action('init', function(){
  if (!wp_next_scheduled('wr_pm_cron_refresh_all')){
    wp_schedule_event(time() + 5, 'wr_every_minute', 'wr_pm_cron_refresh_all');
  }
});

add_action('wr_pm_cron_refresh_all', function(){
  $split = wr_pm_fetch_and_split();
  wr_pm_set_pool_multi($split);
});

/** Cleanup on deactivation */
register_deactivation_hook(__FILE__, function(){
  $ts = wp_next_scheduled('wr_pm_cron_refresh_all');
  if ($ts) wp_unschedule_event($ts, 'wr_pm_cron_refresh_all');
  foreach (WR_PM_POOLS as $p) delete_transient(WR_PM_KEY_PREFIX.$p);
});

/* =======================
 *   REST API
 * ======================= */

add_action('rest_api_init', function(){

  // Force refresh now; returns counts per pool
  register_rest_route('wr-pool/v1', '/prime', [
    'methods'=>'GET',
    'permission_callback'=>'__return_true',
    'callback'=>function(){
      $split = wr_pm_fetch_and_split();
      wr_pm_set_pool_multi($split);
      $counts = [];
      foreach (WR_PM_POOLS as $p) $counts[$p] = count($split[$p] ?? []);
      return new WP_REST_Response(['ttl'=>WR_PM_CACHE_TTL, 'counts'=>$counts], 200);
    }
  ]);

  // List rooms for a pool (lightweight fields)
  register_rest_route('wr-pool/v1', '/list', [
    'methods'=>'GET',
    'permission_callback'=>'__return_true',
    'callback'=>function(WP_REST_Request $req){
      $pool = strtolower($req->get_param('pool') ?: 'general');
      if (!in_array($pool, WR_PM_POOLS, true)) $pool = 'general';
      $cache = wr_pm_get_pool_multi($pool);
      $rows = array_map(function($r){
        return [
          'username'  => $r['username'] ?? '',
          'gender'    => $r['gender'] ?? '',
          'num_users' => (int)($r['num_users'] ?? 0),
          'tags'      => (array)($r['tags'] ?? []),
        ];
      }, $cache['results']);
      return new WP_REST_Response([
        'pool'      => $pool,
        'fetched_at'=> $cache['fetched_at'] ?? null,
        'count'     => count($rows),
        'results'   => $rows,
      ], 200);
    }
  ]);

  // Pick ONE next from a pool (quality-weighted)
  register_rest_route('wr-pool/v1', '/next', [
    'methods'=>'GET',
    'permission_callback'=>'__return_true',
    'callback'=>function(WP_REST_Request $req){
      $pool_name = strtolower($req->get_param('pool') ?: 'general');
      if (!in_array($pool_name, WR_PM_POOLS, true)) $pool_name = 'general';

      $pool = wr_pm_get_pool_multi($pool_name);
      $list = $pool['results'];

      // Emergency repop if empty
      if (empty($list)) {
        $split = wr_pm_fetch_and_split();
        wr_pm_set_pool_multi($split);
        $list = $split[$pool_name] ?? [];
      }

      // HARD FILTER BY POOL (safety, even if cache accidentally mixed)
      $poolToLetter = ['female'=>'f','male'=>'m','trans'=>'t','couple'=>'c'];
      if ($pool_name !== 'general' && isset($poolToLetter[$pool_name])) {
        $want = $poolToLetter[$pool_name];
        $list = array_values(array_filter($list, function($r) use ($want){
          return strtolower($r['gender'] ?? '') === $want;
        }));
      }

      if (empty($list)) return new WP_REST_Response(['returned'=>0, 'pool'=>$pool_name], 200);

      // Light quality weighting: sort by viewers, pick from top quartile
      usort($list, fn($a,$b)=> (int)($b['num_users']??0) <=> (int)($a['num_users']??0));
      $top = array_slice($list, 0, max(1, (int)ceil(count($list)/4)));
      $pick = $top[array_rand($top)];

      $u = $pick['username'] ?? '';
      return new WP_REST_Response([
        'returned'    => 1,
        'pool'        => $pool_name,
        'username'    => $u,
        'embed_src'   => $u ? wr_pm_embed_src($u) : null,
        'num_users'   => (int)($pick['num_users'] ?? 0),
        'gender'      => (string)($pick['gender'] ?? ''),
        'tags'        => (array)($pick['tags'] ?? []),
      ], 200);
    }
  ]);

  // (Optional) tiny diagnostics to verify upstream quickly
  register_rest_route('wr-pool/v1', '/_diag', [
    'methods'=>'GET',
    'permission_callback'=>'__return_true',
    'callback'=>function(){
      $params = wr_pm_base_params(20, null);
      // Uncomment to test the forced tag specifically:
      // $params['tag'] = 'nonude';
      $rooms = wr_pm_fetch_once($params, 0);
      return new WP_REST_Response([
        'ok'     => is_array($rooms),
        'count'  => is_array($rooms) ? count($rooms) : 0,
        'sample' => array_slice($rooms, 0, 3),
      ], 200);
    }
  ]);

});