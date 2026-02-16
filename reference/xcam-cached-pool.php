<?php
/*
Plugin Name: xCam.vip Cached Pools
Description: Fast cached pools with strict gender filtering
Version: 3.0
Author: Wetroulette
*/

defined('ABSPATH') or die('No script kiddies please!');

class WRCachedPools {
    const API_BASE = 'https://chaturbate.com/api/public/affiliates/onlinerooms/';
    const CAMPAIGN = 'roGHG';
    const TOUR = '9oGW';
    const CACHE_TTL = 60;
    
    const POOL_SIZES = [
        'general' => 200,
        'female' => 150,
        'male' => 100,
        'trans' => 80,
        'couple' => 100
    ];
    
    private function fetchFromChaturbate($gender = null) {
        $params = [
            'wm' => self::CAMPAIGN,
            'client_ip' => 'request_ip',
            'format' => 'json',
            'limit' => 500
        ];
        
        if ($gender) {
            $params['gender'] = $gender;
        }
        
        $url = self::API_BASE . '?' . http_build_query($params);
        $response = wp_remote_get($url, ['timeout' => 8]);
        
        if (is_wp_error($response)) return [];
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['results'])) return [];
        
        // Filter: public shows only
        $filtered = array_filter($data['results'], function($r) use ($gender) {
            if (empty($r['username'])) return false;
            if (($r['current_show'] ?? '') !== 'public') return false;
            if (($r['num_users'] ?? 0) < 1) return false;
            
            // STRICT gender check
            if ($gender) {
                if (strtolower($r['gender'] ?? '') !== strtolower($gender)) {
                    return false;
                }
            }
            
            return true;
        });
        
        return array_values($filtered);
    }
    
    public function refreshAllPools() {
        $pools = [
            'general' => $this->fetchFromChaturbate(null),
            'female' => $this->fetchFromChaturbate('f'),
            'male' => $this->fetchFromChaturbate('m'),
            'trans' => $this->fetchFromChaturbate('t'),
            'couple' => $this->fetchFromChaturbate('c')
        ];
        
        foreach ($pools as $name => $results) {
            shuffle($results);
            $capped = array_slice($results, 0, self::POOL_SIZES[$name]);
            
            set_transient("wr_pool_{$name}", [
                'fetched_at' => time(),
                'results' => $capped
            ], self::CACHE_TTL + 15);
        }
        
        return array_map('count', $pools);
    }
    
    public function getFromPool($poolName, $excludedUsernames = []) {
        $cache = get_transient("wr_pool_{$poolName}");
        
        if (!$cache || empty($cache['results'])) {
            // Cache miss - fetch fresh
            $this->refreshAllPools();
            $cache = get_transient("wr_pool_{$poolName}");
        }
        
        if (!$cache || empty($cache['results'])) {
            return null;
        }
        
        $results = $cache['results'];
        
        // Filter out excluded
        $available = array_filter($results, function($r) use ($excludedUsernames) {
            return !in_array(strtolower($r['username'] ?? ''), $excludedUsernames);
        });
        
        // STRICT gender validation before serving
        $genderMap = ['female'=>'f', 'male'=>'m', 'trans'=>'t', 'couple'=>'c'];
        if (isset($genderMap[$poolName])) {
            $expectedGender = $genderMap[$poolName];
            $available = array_filter($available, function($r) use ($expectedGender) {
                return strtolower($r['gender'] ?? '') === $expectedGender;
            });
        }
        
        if (empty($available)) {
            return null;
        }
        
        // Pick random
        $available = array_values($available);
        return $available[array_rand($available)];
    }
    
    public function formatResponse($room, $pool) {
        $username = $room['username'];
        $encoded = rawurlencode($username);
        
        return [
            'success' => true,
            'returned' => 1,
            'pool' => $pool,
            'username' => $username,
            'gender' => $room['gender'] ?? '',
            'embed_src' => "https://www.xcam.vip/embed/{$encoded}/?campaign=" . self::CAMPAIGN .
                          "&disable_sound=0&embed_video_only=1&join_overlay=1&mobileRedirect=auto" .
                          "&room={$encoded}&tour=" . self::TOUR . "&track=wetroulette",
            'num_users' => (int)($room['num_users'] ?? 0),
            'tags' => $room['tags'] ?? []
        ];
    }
}

// Initialize
global $wr_cached_pools;
$wr_cached_pools = new WRCachedPools();

// Cron setup
add_filter('cron_schedules', function($schedules) {
    $schedules['wr_every_minute'] = ['interval' => 60, 'display' => 'Every Minute'];
    return $schedules;
});

add_action('init', function() {
    if (!wp_next_scheduled('wr_refresh_pools')) {
        wp_schedule_event(time() + 5, 'wr_every_minute', 'wr_refresh_pools');
    }
});

add_action('wr_refresh_pools', function() {
    global $wr_cached_pools;
    $wr_cached_pools->refreshAllPools();
});

// REST API
add_action('rest_api_init', function() {
    global $wr_cached_pools;
    
    register_rest_route('wr-pool/v1', '/next', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function(WP_REST_Request $req) use ($wr_cached_pools) {
            $pool = strtolower($req->get_param('pool') ?: 'general');
            $session = $req->get_param('session') ?: '';
            
            // Get excluded
            $excluded = [];
            if ($session) {
                $excluded = get_transient("wr_excluded_{$session}_{$pool}") ?: [];
            }
            
            // Get match
            $match = $wr_cached_pools->getFromPool($pool, $excluded);
            
            if (!$match) {
                // Reset excluded and try once more
                if ($session) {
                    delete_transient("wr_excluded_{$session}_{$pool}");
                }
                $match = $wr_cached_pools->getFromPool($pool, []);
            }
            
            if (!$match) {
                return new WP_REST_Response(['returned' => 0, 'pool' => $pool], 200);
            }
            
            // Add to excluded
            if ($session) {
                $excluded[] = strtolower($match['username']);
                set_transient("wr_excluded_{$session}_{$pool}", $excluded, 3600);
            }
            
            return new WP_REST_Response(
                $wr_cached_pools->formatResponse($match, $pool),
                200
            );
        }
    ]);
    
    // Prime endpoint
    register_rest_route('wr-pool/v1', '/prime', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function() use ($wr_cached_pools) {
            $counts = $wr_cached_pools->refreshAllPools();
            return new WP_REST_Response(['counts' => $counts], 200);
        }
    ]);
});

// Cleanup
register_deactivation_hook(__FILE__, function() {
    $ts = wp_next_scheduled('wr_refresh_pools');
    if ($ts) wp_unschedule_event($ts, 'wr_refresh_pools');
    
    foreach (['general','female','male','trans','couple'] as $p) {
        delete_transient("wr_pool_{$p}");
    }
});
?>