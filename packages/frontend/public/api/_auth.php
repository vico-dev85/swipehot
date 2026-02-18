<?php
/**
 * Admin authentication helper — cookie-based with HMAC token.
 * More reliable than PHP sessions on some server configurations.
 */
require_once __DIR__ . '/_config.php';

define('AUTH_COOKIE_NAME', 'xcam_admin');
define('AUTH_COOKIE_TTL', 86400 * 7); // 7 days

function _authSecret(): string {
    // Derive a signing key from the admin password
    return hash('sha256', 'xcam_admin_auth_' . (defined('ADMIN_PASS') ? ADMIN_PASS : ''));
}

function _makeToken(int $expires): string {
    $payload = $expires;
    $sig = hash_hmac('sha256', (string)$payload, _authSecret());
    return $payload . '.' . $sig;
}

function _verifyToken(string $token): bool {
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return false;
    $expires = (int)$parts[0];
    $sig = $parts[1];
    if (time() > $expires) return false;
    $expected = hash_hmac('sha256', (string)$expires, _authSecret());
    return hash_equals($expected, $sig);
}

function isAuthenticated(): bool {
    $token = $_COOKIE[AUTH_COOKIE_NAME] ?? '';
    return $token !== '' && _verifyToken($token);
}

function requireAuth(): void {
    if (!isAuthenticated()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

function login(string $password): bool {
    if (!defined('ADMIN_PASS')) return false;

    if (hash_equals(ADMIN_PASS, $password)) {
        $expires = time() + AUTH_COOKIE_TTL;
        $token = _makeToken($expires);
        setcookie(AUTH_COOKIE_NAME, $token, [
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => true,
            'httponly'  => true,
            'samesite' => 'Lax',
        ]);
        // Also set for current request
        $_COOKIE[AUTH_COOKIE_NAME] = $token;
        return true;
    }
    return false;
}

function logout(): void {
    setcookie(AUTH_COOKIE_NAME, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'secure'   => true,
        'httponly'  => true,
        'samesite' => 'Lax',
    ]);
    unset($_COOKIE[AUTH_COOKIE_NAME]);
}
